import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  onCancel: () => void;
  isUploading?: boolean;
}

// Encode an AudioBuffer as a WAV Blob (PCM 16-bit, mono).
// WAV has 100% playback support on every browser and device — no codec negotiation needed.
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = 1; // mix down to mono
  const sampleRate = buffer.sampleRate;
  const samples = buffer.getChannelData(0); // use first channel
  const pcm = new Int16Array(samples.length);

  // Float32 → Int16 with clamping
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const dataLen = pcm.byteLength;
  const wavBuf = new ArrayBuffer(44 + dataLen);
  const view = new DataView(wavBuf);

  const write = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  write(0, "RIFF");
  view.setUint32(4, 36 + dataLen, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);          // chunk size
  view.setUint16(20, 1, true);           // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true); // byte rate
  view.setUint16(32, numChannels * 2, true);              // block align
  view.setUint16(34, 16, true);          // bits per sample
  write(36, "data");
  view.setUint32(40, dataLen, true);

  new Int16Array(wavBuf, 44).set(pcm);
  return new Blob([wavBuf], { type: "audio/wav" });
}

// Decode any recorded blob (webm/mp4/ogg) → WAV via AudioContext.
// AudioContext.decodeAudioData is supported on every modern browser including
// Firefox, iOS Safari, and Android Chrome without exception.
async function convertToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    return audioBufferToWav(audioBuffer);
  } finally {
    ctx.close();
  }
}

const VoiceRecorder = ({ onRecordingComplete, onCancel, isUploading }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [waveformValues, setWaveformValues] = useState<number[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const durationRef = useRef(0);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      // webm/opus first — reliable on Chrome/Firefox/Android desktop.
      // mp4 is fallback for iOS Safari which doesn't support webm.
      // We convert everything to WAV after, so format here only matters for recording reliability.
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4", ""]
        .find((t) => t === "" || MediaRecorder.isTypeSupported(t))!;

      // Some browsers return isTypeSupported=true but throw on construction — try/catch per type.
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      } catch {
        mediaRecorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const actualType = mediaRecorder.mimeType || "audio/webm";
        const raw = new Blob(chunksRef.current, { type: actualType });

        // Convert to WAV so every device can play it — Firefox, iOS Safari, Android Chrome.
        setIsConverting(true);
        try {
          const wav = await convertToWav(raw);
          setAudioBlob(wav);
        } catch {
          // Conversion failed — fall back to the raw blob (better than nothing).
          setAudioBlob(raw);
        } finally {
          setIsConverting(false);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setDuration(0);
      durationRef.current = 0;
      setWaveformValues([]);

      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration(durationRef.current);
      }, 1000);

      const updateWaveform = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const normalized = Math.min(avg / 128, 1);
        setWaveformValues((prev) => [...prev.slice(-40), normalized]);
        animFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();
    } catch (err) {
      console.error("Recording failed:", err);
      toast.error("Couldn't access microphone. Please allow microphone permission and try again.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);

  const handleSend = useCallback(() => {
    if (audioBlob) {
      onRecordingComplete(audioBlob, durationRef.current);
      setAudioBlob(null);
      setDuration(0);
      durationRef.current = 0;
      setWaveformValues([]);
    }
  }, [audioBlob, onRecordingComplete]);

  const handleCancel = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
    setAudioBlob(null);
    setDuration(0);
    durationRef.current = 0;
    setWaveformValues([]);
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    onCancel();
  }, [onCancel]);

  useEffect(() => {
    startRecording();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="flex items-center gap-2 w-full animate-in slide-in-from-bottom-2 duration-200">
      {/* Cancel */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCancel}
        className="h-10 w-10 text-destructive hover:bg-destructive/10 flex-shrink-0"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      {/* Waveform + timer */}
      <div className="flex-1 flex items-center gap-3 px-3 py-2 rounded-full bg-muted/60 border border-border/50">
        <div className={cn(
          "w-2.5 h-2.5 rounded-full flex-shrink-0",
          isRecording ? "bg-red-500 animate-pulse" : isConverting ? "bg-bronze animate-pulse" : "bg-muted-foreground/30"
        )} />

        <div className="flex items-center gap-[2px] h-6 flex-1 overflow-hidden">
          {waveformValues.map((v, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full bg-bronze/70 flex-shrink-0 transition-all duration-75"
              style={{ height: `${Math.max(4, v * 24)}px` }}
            />
          ))}
          {waveformValues.length < 40 &&
            Array.from({ length: 40 - waveformValues.length }).map((_, i) => (
              <div key={`p-${i}`} className="w-[3px] h-1 rounded-full bg-muted-foreground/15 flex-shrink-0" />
            ))}
        </div>

        <span className="text-xs font-mono text-muted-foreground tabular-nums flex-shrink-0">
          {isConverting ? "…" : formatDuration(duration)}
        </span>
      </div>

      {/* Stop / Send */}
      {isRecording ? (
        <Button
          onClick={stopRecording}
          size="icon"
          className="h-10 w-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex-shrink-0"
        >
          <Square className="h-4 w-4 fill-current" />
        </Button>
      ) : isConverting ? (
        <Button
          disabled
          size="icon"
          className="h-10 w-10 rounded-full bg-bronze/50 text-background flex-shrink-0"
        >
          <div className="w-4 h-4 border-2 border-background/40 border-t-background rounded-full animate-spin" />
        </Button>
      ) : audioBlob ? (
        <Button
          onClick={handleSend}
          disabled={isUploading}
          size="icon"
          className="h-10 w-10 rounded-full bg-bronze hover:bg-bronze/90 text-background flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
};

export default VoiceRecorder;
