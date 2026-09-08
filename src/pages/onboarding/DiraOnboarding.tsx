import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import DiraMessage from "@/components/onboarding/DiraMessage";
import UserResponse from "@/components/onboarding/UserResponse";
import OptionButtons from "@/components/onboarding/OptionButtons";
import TypingIndicator from "@/components/onboarding/TypingIndicator";
import OnboardingHeader from "@/components/onboarding/OnboardingHeader";
import TextInput from "@/components/onboarding/TextInput";


// Creator flow steps
const creatorSteps = [
  {
    id: "welcome",
    diraMessage: (name: string, _?: string) => `Hi 👋 ${name || "there"}! I'm Dira, your creative companion at Kaizen Afrika. I'm so excited to meet you! Let's go through a few quick steps so I can personalize your experience. Ready?`,
    options: [
      { label: "Let's do this! 🚀", value: "ready" },
      { label: "Sure thing! ✨", value: "ready" }
    ],
    type: "options" as const
  },
  {
    id: "creator_type",
    diraMessage: (_?: string, __?: string) => "Amazing! First things first — what kind of creator are you? Pick all that fit you 🎨",
    options: [
      { label: "Content Creator", value: "content_creator" },
      { label: "UGC Creator", value: "ugc_creator" },
      { label: "Coach / Educator", value: "coach" },
      { label: "Designer", value: "designer" },
      { label: "Photographer", value: "photographer" },
      { label: "Videographer", value: "videographer" },
      { label: "Writer", value: "writer" },
      { label: "Influencer", value: "influencer" },
      { label: "Other", value: "other" }
    ],
    type: "multi-select" as const,
    hasOther: true
  },
  {
    id: "goals",
    diraMessage: (_?: string, __?: string) => "Love it! 💪 Now tell me — what are you hoping to achieve with Kaizen Afrika?",
    options: [
      { label: "Find brand deals 💰", value: "brand_deals" },
      { label: "Earn from my skills 💼", value: "earn_skills" },
      { label: "Grow my audience 📈", value: "grow_audience" },
      { label: "Build my personal brand ✨", value: "personal_brand" },
      { label: "Organize my workflow 📋", value: "workflow" },
      { label: "Other", value: "other" }
    ],
    type: "multi-select" as const,
    hasOther: true
  },
  {
    id: "handle",
    diraMessage: (_?: string, __?: string) => "Awesome goals! 🎯 Now let's set up your Kaizen Link. What should your username be? This will be your public profile URL (kaizenafrika.app/yourname)",
    type: "text" as const,
    placeholder: "yourname",
    prefix: "kaizenafrika.app/"
  },
  {
    id: "bio",
    diraMessage: (_, handle: string) => `Nice choice, @${handle}! 🌟 Now write a short bio to introduce yourself to brands and other creators. Keep it snappy!`,
    type: "textarea" as const,
    placeholder: "I'm a creative soul who loves...",
    optional: true
  },
  {
    id: "complete",
    diraMessage: (name: string, _?: string) => `You're officially part of the Kaizen Afrika family, ${name || "friend"}! 🎉\n\nI've set up your profile and I'm ready to help you find amazing opportunities, grow your audience, and make your creative dreams come true.\n\nLet's go make some magic happen! ✨🦁`,
    type: "final" as const
  }
];

// Brand flow steps
const brandSteps = [
  {
    id: "welcome",
    diraMessage: (name: string, _?: string) => `Hey there 👋 ${name || ""}! I'm Dira, and I'll be helping you discover amazing creators for your brand. Let's set up your profile real quick!`,
    options: [
      { label: "Let's get started! 🚀", value: "ready" },
      { label: "Sounds good! ✨", value: "ready" }
    ],
    type: "options" as const
  },
  {
    id: "business_type",
    diraMessage: (_?: string, __?: string) => "First up — what type of business are you? 🏢",
    options: [
      { label: "Startup", value: "startup" },
      { label: "Agency", value: "agency" },
      { label: "Company", value: "company" },
      { label: "Corporate", value: "corporate" },
      { label: "NGO", value: "ngo" },
      { label: "Other", value: "other" }
    ],
    type: "single-select" as const,
    hasOther: true
  },
  {
    id: "goals",
    diraMessage: (_?: string, __?: string) => "Perfect! 💼 What are you hoping to achieve with Kaizen Afrika?",
    options: [
      { label: "Discover creators faster 🔍", value: "discover_creators" },
      { label: "Run organized campaigns 📊", value: "campaigns" },
      { label: "Track performance 📈", value: "analytics" },
      { label: "Scale UGC operations 🎬", value: "ugc" },
      { label: "Build creator relationships 🤝", value: "relationships" },
      { label: "Other", value: "other" }
    ],
    type: "multi-select" as const,
    hasOther: true
  },
  {
    id: "brand_name",
    diraMessage: (_?: string, __?: string) => "Exciting goals! 🎯 What's your brand name?",
    type: "text" as const,
    placeholder: "Your Brand Name"
  },
  {
    id: "handle",
    diraMessage: (_?: string, brandName?: string) => `${brandName || "Your brand"} — love it! 💜 Now let's pick your Kaizen Afrika handle. This will be your public profile where creators can learn about you.`,
    type: "text" as const,
    placeholder: "yourbrand",
    prefix: "kaizenafrika.app/"
  },
  {
    id: "description",
    diraMessage: (_?: string, __?: string) => "Almost there! Write a quick description about your brand so creators know who you are 📝",
    type: "textarea" as const,
    placeholder: "We're a brand that...",
    optional: true
  },
  {
    id: "complete",
    diraMessage: (name: string, _?: string) => `Welcome to Kaizen Afrika, ${name || "friend"}! 🎉\n\nYour brand profile is all set up. I'm here to help you find the perfect creators for your campaigns and make collaboration seamless.\n\nLet's build something amazing together! 🦁✨`,
    type: "final" as const
  }
];

interface Message {
  id: string;
  type: "dira" | "user";
  content: string;
  timestamp: Date;
}

const DiraOnboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [userType, setUserType] = useState<"creator" | "brand" | null>(null);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [textInput, setTextInput] = useState("");
  const [otherText, setOtherText] = useState("");
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Collected data
  const [collectedData, setCollectedData] = useState<Record<string, any>>({});

  const steps = userType === "creator" ? creatorSteps : brandSteps;
  const currentStepData = steps[currentStep];

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Initialize - get user data
  useEffect(() => {
    const initUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      setUserId(session.user.id);
      
      // Get user's name from metadata
      const fullName = session.user.user_metadata?.full_name || 
                       session.user.user_metadata?.name ||
                       session.user.email?.split("@")[0] || "";
      const firstName = fullName.split(" ")[0];
      setUserName(firstName);

      // Check if user already has a profile with user_type
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type, handle, bio, display_name")
        .eq("id", session.user.id)
        .single();

      if (profile?.user_type) {
        // Check if onboarding is already complete by checking creator/brand profiles
        let onboardingComplete = false;
        
        if (profile.user_type === "creator") {
          const { data: creatorProfile } = await supabase
            .from("creator_profiles")
            .select("id, creator_types")
            .eq("profile_id", session.user.id)
            .single();
          onboardingComplete = !!(creatorProfile?.creator_types && creatorProfile.creator_types.length > 0);
        } else if (profile.user_type === "brand") {
          const { data: brandProfile } = await supabase
            .from("brand_profiles")
            .select("id, business_type")
            .eq("profile_id", session.user.id)
            .single();
          onboardingComplete = !!brandProfile?.business_type;
        }

        if (onboardingComplete) {
          navigate("/dashboard");
          return;
        }
        
        setUserType(profile.user_type as "creator" | "brand");
      }
      
      setIsLoading(false);
    };

    initUser();
  }, [navigate]);

  // Start conversation when userType is set
  useEffect(() => {
    if (userType && !isLoading && messages.length === 0) {
      showDiraMessage(0);
    }
  }, [userType, isLoading]);

  const showDiraMessage = async (stepIndex: number) => {
    const step = steps[stepIndex];
    if (!step) return;

    setIsTyping(true);
    
    // Simulate typing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    
    let messageContent = "";
    if (step.id === "welcome") {
      messageContent = step.diraMessage(userName);
    } else if (step.id === "bio") {
      messageContent = step.diraMessage(userName, collectedData.handle || "");
    } else if (step.id === "handle" && userType === "brand") {
      messageContent = step.diraMessage(userName, collectedData.brand_name || "");
    } else if (step.id === "complete") {
      messageContent = step.diraMessage(userName);
    } else {
      messageContent = step.diraMessage(userName);
    }

    setMessages(prev => [...prev, {
      id: `dira-${stepIndex}-${Date.now()}`,
      type: "dira",
      content: messageContent,
      timestamp: new Date()
    }]);
    
    setIsTyping(false);
    setSelectedOptions([]);
    setTextInput("");
    setOtherText("");
    setShowOtherInput(false);
  };

  const handleOptionSelect = (value: string) => {
    if (currentStepData?.type === "single-select" || currentStepData?.type === "options") {
      if (value === "other" && currentStepData.hasOther) {
        setShowOtherInput(true);
        setSelectedOptions([value]);
      } else {
        setSelectedOptions([value]);
        if (!currentStepData.hasOther || value !== "other") {
          setTimeout(() => handleContinue([value]), 300);
        }
      }
    } else if (currentStepData?.type === "multi-select") {
      if (value === "other" && currentStepData.hasOther) {
        setShowOtherInput(!showOtherInput);
        if (selectedOptions.includes(value)) {
          setSelectedOptions(prev => prev.filter(v => v !== value));
        } else {
          setSelectedOptions(prev => [...prev, value]);
        }
      } else {
        if (selectedOptions.includes(value)) {
          setSelectedOptions(prev => prev.filter(v => v !== value));
        } else {
          setSelectedOptions(prev => [...prev, value]);
        }
      }
    }
  };

  const handleContinue = async (options?: string[]) => {
    const finalOptions = options || selectedOptions;
    
    if (currentStepData?.type === "multi-select" && finalOptions.length === 0) {
      toast({ title: "Please select at least one option! 🎯" });
      return;
    }

    let userResponseText = "";
    let dataToStore: any = finalOptions;

    if (currentStepData?.type === "options" || currentStepData?.type === "single-select") {
      const selectedOption = currentStepData.options?.find(o => o.value === finalOptions[0]);
      userResponseText = selectedOption?.label || finalOptions[0];
      dataToStore = finalOptions[0];
    } else if (currentStepData?.type === "multi-select") {
      const selectedLabels = finalOptions.map(v => {
        const option = currentStepData.options?.find(o => o.value === v);
        return option?.label || v;
      });
      if (showOtherInput && otherText && finalOptions.includes("other")) {
        selectedLabels.push(otherText);
        dataToStore = [...finalOptions.filter(v => v !== "other"), otherText];
      }
      userResponseText = selectedLabels.join(", ");
    } else if (currentStepData?.type === "text" || currentStepData?.type === "textarea") {
      if (!textInput.trim() && !currentStepData.optional) {
        toast({ title: "Please enter something! ✏️" });
        return;
      }
      userResponseText = currentStepData.prefix ? `${currentStepData.prefix}${textInput}` : textInput;
      dataToStore = textInput.trim();
    }

    // Add user response to messages
    if (userResponseText) {
      setMessages(prev => [...prev, {
        id: `user-${currentStep}-${Date.now()}`,
        type: "user",
        content: userResponseText,
        timestamp: new Date()
      }]);
    }

    // Store collected data
    setCollectedData(prev => ({
      ...prev,
      [currentStepData?.id || ""]: dataToStore
    }));

    // Move to next step
    const nextStep = currentStep + 1;
    
    if (nextStep < steps.length) {
      setCurrentStep(nextStep);
      setTimeout(() => showDiraMessage(nextStep), 500);
    }
  };

  const handleComplete = async () => {
    if (!userId) return;

    try {
      // Update profile with collected data
      const profileUpdate: any = {
        handle: collectedData.handle || userName.toLowerCase(),
        bio: collectedData.bio || collectedData.description || null,
        display_name: collectedData.brand_name || userName,
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", userId);

      if (profileError) throw profileError;

      // Update creator or brand specific profile
      if (userType === "creator") {
        const { data: existingCreator } = await supabase
          .from("creator_profiles")
          .select("id")
          .eq("profile_id", userId)
          .single();

        if (existingCreator) {
          await supabase
            .from("creator_profiles")
            .update({
              creator_types: collectedData.creator_type || [],
              goals: collectedData.goals || []
            })
            .eq("profile_id", userId);
        } else {
          await supabase
            .from("creator_profiles")
            .insert({
              profile_id: userId,
              creator_types: collectedData.creator_type || [],
              goals: collectedData.goals || []
            });
        }
      } else if (userType === "brand") {
        const { data: existingBrand } = await supabase
          .from("brand_profiles")
          .select("id")
          .eq("profile_id", userId)
          .single();

        if (existingBrand) {
          await supabase
            .from("brand_profiles")
            .update({
              business_type: collectedData.business_type || null,
              goals: collectedData.goals || [],
              company_description: collectedData.description || null
            })
            .eq("profile_id", userId);
        } else {
          await supabase
            .from("brand_profiles")
            .insert({
              profile_id: userId,
              business_type: collectedData.business_type || null,
              goals: collectedData.goals || [],
              company_description: collectedData.description || null
            });
        }
      }

      toast({ title: "Welcome to Kaizen Afrika! 🎉" });
      navigate("/dashboard");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({ 
        title: "Oops! Something went wrong 😅", 
        description: "Please try again.",
        variant: "destructive" 
      });
    }
  };

  // User type selection screen
  if (!userType && !isLoading) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-background via-bronze/5 to-background flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg text-center"
        >
           <div className="mb-8">
             <motion.div 
               initial={{ scale: 0 }}
               animate={{ scale: 1 }}
               transition={{ type: "spring", delay: 0.2 }}
               className="w-24 h-24 mx-auto mb-6 relative"
             >
               <motion.div
                 animate={{ scale: [1, 1.2, 1] }}
                 transition={{ repeat: Infinity, duration: 2 }}
                 className="text-5xl flex items-center justify-center w-full h-full"
               >
                 👋
               </motion.div>
             </motion.div>
            <h1 className="font-vollkorn text-3xl md:text-4xl font-bold mb-3">
              Hey {userName || "there"}! 
            </h1>
            <p className="text-muted-foreground text-lg">
              I'm Dira. Before we begin, are you joining as a...
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleUserTypeSelect("creator")}
              className="p-6 rounded-2xl bg-card border-2 border-transparent hover:border-bronze transition-all group"
            >
              <div className="text-4xl mb-3">🎨</div>
              <h3 className="font-vollkorn text-xl font-bold mb-1 group-hover:text-bronze transition-colors">Creator</h3>
              <p className="text-sm text-muted-foreground">Sell products & services</p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleUserTypeSelect("brand")}
              className="p-6 rounded-2xl bg-card border-2 border-transparent hover:border-bronze transition-all group"
            >
              <div className="text-4xl mb-3">🏢</div>
              <h3 className="font-vollkorn text-xl font-bold mb-1 group-hover:text-bronze transition-colors">Brand</h3>
              <p className="text-sm text-muted-foreground">Find & hire creators</p>
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleUserTypeSelect = async (type: "creator" | "brand") => {
    if (!userId) return;
    
    // Save user type to profile
    await supabase
      .from("profiles")
      .update({ user_type: type })
      .eq("id", userId);
    
    setUserType(type);
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-background via-bronze/5 to-background flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-3 border-bronze border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-dvh bg-gradient-to-br from-background via-bronze/5 to-background flex flex-col safe-area-pt safe-area-pb">
      <OnboardingHeader progress={progress} />
      
      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-32">
        <div className="max-w-2xl mx-auto space-y-4">
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                {message.type === "dira" ? (
                  <DiraMessage content={message.content} />
                ) : (
                  <UserResponse content={message.content} />
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <TypingIndicator />
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <AnimatePresence>
        {!isTyping && currentStepData && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-8 pb-6 px-4"
          >
            <div className="max-w-2xl mx-auto">
              {(currentStepData.type === "options" || 
                currentStepData.type === "single-select" || 
                currentStepData.type === "multi-select") && (
                <div className="space-y-3">
                  <OptionButtons
                    options={currentStepData.options || []}
                    selected={selectedOptions}
                    onSelect={handleOptionSelect}
                    multiSelect={currentStepData.type === "multi-select"}
                  />
                  
                  {showOtherInput && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                    >
                      <TextInput
                        value={otherText}
                        onChange={setOtherText}
                        placeholder="Please specify..."
                        type="text"
                      />
                    </motion.div>
                  )}
                  
                  {currentStepData.type === "multi-select" && selectedOptions.length > 0 && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => handleContinue()}
                      className="w-full py-3 bg-bronze hover:bg-bronze-dark text-white rounded-xl font-semibold transition-colors"
                    >
                      Continue →
                    </motion.button>
                  )}
                </div>
              )}

              {(currentStepData.type === "text" || currentStepData.type === "textarea") && (
                <div className="space-y-3">
                  <TextInput
                    value={textInput}
                    onChange={setTextInput}
                    placeholder={currentStepData.placeholder || ""}
                    type={currentStepData.type}
                    prefix={currentStepData.prefix}
                    onSubmit={() => handleContinue()}
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleContinue()}
                    className="w-full py-3 bg-bronze hover:bg-bronze-dark text-white rounded-xl font-semibold transition-colors"
                  >
                    {currentStepData.optional ? "Continue (or skip) →" : "Continue →"}
                  </motion.button>
                </div>
              )}

              {currentStepData.type === "final" && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleComplete}
                  className="w-full py-4 bg-gradient-to-r from-bronze to-bronze-light text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-bronze/20"
                >
                  Let's Go! 🚀
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DiraOnboarding;
