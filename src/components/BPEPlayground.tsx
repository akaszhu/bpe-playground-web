import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  RotateCcw,
  BookOpen,
  Settings2,
  Brain,
  Eye,
  Zap,
  GitBranch,
  Linkedin,
  FileText,
  Download,
  Upload,
  BarChart3,
  LineChart,
  Layers,
  Cpu,
  Database,
  Share2,
  Info,
  AlertCircle,
  CheckCircle2,
  Hash,
  Target,
  Workflow,
  Code2,
  Globe,
  TrendingUp,
} from "lucide-react";

interface BPEStep {
  iteration: number;
  mostFrequentPair: [string, string] | null;
  frequency: number;
  vocabulary: string[];
  mergedTokens: string[];
  compressionRatio: number;
  mergingRules: Array<{ pair: [string, string]; newToken: string }>;
  pairFrequencies: Map<string, number>;
}

interface BPEResult {
  steps: BPEStep[];
  finalTokens: string[];
  finalVocabulary: string[];
  statistics: {
    totalMerges: number;
    finalCompressionRatio: number;
    uniqueChars: number;
    averageTokenLength: number;
    vocabularyEfficiency: number;
  };
}

interface TokenizerModel {
  name: string;
  description: string;
  vocabSize: number;
  specialTokens: string[];
  icon: typeof Brain;
  preprocessing: string;
  mergeStrategy: string;
  realWorldUsage: string[];
}

const TOKENIZER_MODELS: TokenizerModel[] = [
  {
    name: "GPT-2",
    description: "OpenAI's GPT-2 BPE tokenizer with 50,257 vocab size",
    vocabSize: 50257,
    specialTokens: ["<|endoftext|>"],
    icon: Brain,
    preprocessing: "Byte-level BPE with Unicode normalization",
    mergeStrategy: "Frequency-based merging with character fallback",
    realWorldUsage: ["GPT-2", "GPT-3.5-turbo", "Codex"],
  },
  {
    name: "GPT-4",
    description:
      "GPT-4 cl100k_base tokenizer with enhanced multilingual support",
    vocabSize: 100256,
    specialTokens: [
      "<|endoftext|>",
      "<|fim_prefix|>",
      "<|fim_middle|>",
      "<|fim_suffix|>",
    ],
    icon: Zap,
    preprocessing: "Advanced byte-level BPE with improved handling",
    mergeStrategy: "Optimized frequency merging with special token handling",
    realWorldUsage: ["GPT-4", "GPT-4-turbo", "ChatGPT"],
  },
  {
    name: "BERT",
    description: "BERT WordPiece tokenizer with 30K vocabulary",
    vocabSize: 30522,
    specialTokens: ["[CLS]", "[SEP]", "[PAD]", "[UNK]", "[MASK]"],
    icon: GitBranch,
    preprocessing: "WordPiece with ## subword prefixing",
    mergeStrategy: "Likelihood-based merging prioritizing common patterns",
    realWorldUsage: ["BERT", "RoBERTa", "DeBERTa", "ELECTRA"],
  },
  {
    name: "T5/SentencePiece",
    description: "T5's SentencePiece unigram tokenizer",
    vocabSize: 32128,
    specialTokens: ["<pad>", "</s>", "<unk>", "<extra_id_0>"],
    icon: Layers,
    preprocessing: "Language-agnostic with whitespace normalization",
    mergeStrategy: "Unigram language model with EM algorithm",
    realWorldUsage: ["T5", "mT5", "UL2", "PaLM"],
  },
  {
    name: "LLaMA",
    description: "LLaMA's SentencePiece BPE with 32K vocabulary",
    vocabSize: 32000,
    specialTokens: ["<s>", "</s>", "<unk>"],
    icon: Target,
    preprocessing: "SentencePiece BPE with normalized text",
    mergeStrategy: "BPE with subword regularization",
    realWorldUsage: ["LLaMA", "LLaMA-2", "Alpaca", "Vicuna"],
  },
  {
    name: "Custom",
    description: "Create your own BPE tokenizer with custom settings",
    vocabSize: 1000,
    specialTokens: ["</w>"],
    icon: Settings2,
    preprocessing: "Configurable preprocessing pipeline",
    mergeStrategy: "Standard BPE with customizable parameters",
    realWorldUsage: ["Research", "Domain-specific applications"],
  },
];

const SAMPLE_TEXTS = [
  {
    name: "Transformer Paper",
    text: "attention is all you need transformer architecture self attention mechanism encoder decoder layers positional encoding multi head attention",
  },
  {
    name: "Programming Code",
    text: "def tokenize_text(input_string): tokens = input_string.split() return [token.lower() for token in tokens if token.isalnum()]",
  },
  {
    name: "Multilingual",
    text: "hello world 你好世界 bonjour monde hola mundo こんにちは世界 مرحبا بالعالم",
  },
  {
    name: "Technical Terms",
    text: "machine learning artificial intelligence natural language processing deep neural networks backpropagation gradient descent optimization algorithms",
  },
  {
    name: "Common English",
    text: "the quick brown fox jumps over the lazy dog this is a simple sentence with common english words and phrases",
  },
];

const BPEPlayground = () => {
  const [inputText, setInputText] = useState(
    "attention is all you need transformer architecture"
  );
  const [selectedModel, setSelectedModel] = useState("Custom");
  const [vocabSize, setVocabSize] = useState(1000);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1000);
  const [showStatistics, setShowStatistics] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [selectedSample, setSelectedSample] = useState("");
  const [compressionHistory, setCompressionHistory] = useState<number[]>([]);

  const currentModel =
    TOKENIZER_MODELS.find((m) => m.name === selectedModel) ||
    TOKENIZER_MODELS[5];

  // Update vocab size when model changes
  useEffect(() => {
    if (selectedModel !== "Custom") {
      setVocabSize(currentModel.vocabSize);
    }
  }, [selectedModel, currentModel.vocabSize]);

  // Enhanced BPE Algorithm Implementation
  const computeBPE = (
    text: string,
    maxVocabSize: number,
    model: TokenizerModel
  ): BPEResult => {
    // Advanced preprocessing based on model type
    let processedText = text;

    if (model.name.includes("GPT")) {
      // GPT-style preprocessing with byte-level handling
      processedText = text.replace(/\s+/g, " ").trim();
    } else if (model.name === "BERT") {
      // BERT-style preprocessing
      processedText = text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    } else if (model.name.includes("T5") || model.name.includes("LLaMA")) {
      // SentencePiece-style preprocessing
      processedText = text.replace(/\s+/g, "▁").replace(/^▁/, "");
    }

    // Enhanced tokenization
    const words = processedText.split(/\s+/).filter((word) => word.length > 0);
    let tokens: string[] = [];

    words.forEach((word) => {
      if (model.name === "BERT") {
        // BERT uses ## for subwords
        const chars = word.split("");
        tokens = tokens.concat(
          chars.map((char, i) => (i === 0 ? char : `##${char}`))
        );
      } else if (model.name.includes("T5")) {
        // T5/SentencePiece handling
        const chars = word.split("");
        tokens = tokens.concat(chars);
      } else {
        // Standard BPE with </w>
        const chars = word.split("").concat(["</w>"]);
        tokens = tokens.concat(chars);
      }
    });

    // Initialize vocabulary with characters and special tokens
    const uniqueChars = [
      ...new Set(
        tokens.filter((t) => !t.includes("</w>") && !t.includes("##"))
      ),
    ];
    const vocabulary = [...uniqueChars, ...model.specialTokens];
    const steps: BPEStep[] = [];
    const mergingRules: Array<{ pair: [string, string]; newToken: string }> =
      [];

    // Calculate initial statistics
    const initialCompressionRatio = text.length / tokens.length;

    // Initial step
    steps.push({
      iteration: 0,
      mostFrequentPair: null,
      frequency: 0,
      vocabulary: [...vocabulary],
      mergedTokens: [...tokens],
      compressionRatio: initialCompressionRatio,
      mergingRules: [...mergingRules],
      pairFrequencies: new Map(),
    });

    let currentTokens = [...tokens];
    let currentVocabulary = [...vocabulary];
    const maxIterations = Math.min(maxVocabSize - vocabulary.length, 100);

    for (
      let iter = 1;
      iter <= maxIterations && currentVocabulary.length < maxVocabSize;
      iter++
    ) {
      // Count pair frequencies with enhanced tracking
      const pairCounts: Map<string, number> = new Map();

      for (let i = 0; i < currentTokens.length - 1; i++) {
        const pair = `${currentTokens[i]}|||${currentTokens[i + 1]}`;
        pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
      }

      if (pairCounts.size === 0) break;

      // Find most frequent pair with tie-breaking
      let mostFrequentPair: [string, string] | null = null;
      let maxFreq = 0;

      for (const [pair, freq] of pairCounts.entries()) {
        const [first, second] = pair.split("|||");
        if (
          freq > maxFreq ||
          (freq === maxFreq &&
            pair.length <
              (mostFrequentPair
                ? mostFrequentPair[0] + mostFrequentPair[1]
                : ""
              ).length)
        ) {
          maxFreq = freq;
          mostFrequentPair = [first, second];
        }
      }

      if (!mostFrequentPair || maxFreq < 2) break;

      // Create new token with model-specific rules
      let newToken: string;
      if (model.name === "BERT" && mostFrequentPair[1].startsWith("##")) {
        newToken = mostFrequentPair[0] + mostFrequentPair[1].substring(2);
      } else if (model.name.includes("T5") || model.name.includes("LLaMA")) {
        newToken = mostFrequentPair[0] + mostFrequentPair[1];
      } else {
        newToken = mostFrequentPair[0] + mostFrequentPair[1];
      }

      // Merge tokens
      const newTokens: string[] = [];
      for (let i = 0; i < currentTokens.length; i++) {
        if (
          i < currentTokens.length - 1 &&
          currentTokens[i] === mostFrequentPair[0] &&
          currentTokens[i + 1] === mostFrequentPair[1]
        ) {
          newTokens.push(newToken);
          i++; // Skip next token
        } else {
          newTokens.push(currentTokens[i]);
        }
      }

      currentTokens = newTokens;
      currentVocabulary.push(newToken);
      mergingRules.push({ pair: mostFrequentPair, newToken });

      const compressionRatio = text.length / currentTokens.length;

      steps.push({
        iteration: iter,
        mostFrequentPair,
        frequency: maxFreq,
        vocabulary: [...currentVocabulary],
        mergedTokens: [...currentTokens],
        compressionRatio,
        mergingRules: [...mergingRules],
        pairFrequencies: new Map(pairCounts),
      });
    }

    // Calculate final statistics
    const finalTokens = steps[steps.length - 1].mergedTokens;
    const finalVocabulary = steps[steps.length - 1].vocabulary;
    const averageTokenLength =
      finalTokens.reduce((sum, token) => sum + token.length, 0) /
      finalTokens.length;
    const vocabularyEfficiency = finalVocabulary.length / maxVocabSize;

    return {
      steps,
      finalTokens,
      finalVocabulary,
      statistics: {
        totalMerges: steps.length - 1,
        finalCompressionRatio: text.length / finalTokens.length,
        uniqueChars: uniqueChars.length,
        averageTokenLength,
        vocabularyEfficiency,
      },
    };
  };

  const bpeResult = useMemo(() => {
    const result = computeBPE(inputText, vocabSize, currentModel);
    // Update compression history for visualization
    const history = result.steps.map((step) => step.compressionRatio);
    setCompressionHistory(history);
    return result;
  }, [inputText, vocabSize, currentModel]);

  const handleReset = () => {
    setCurrentStep(0);
    setIsAnimating(false);
  };

  const handleAnimate = () => {
    setIsAnimating(true);
    setCurrentStep(0);

    const animate = (step: number) => {
      if (step < bpeResult.steps.length - 1) {
        setTimeout(() => {
          setCurrentStep(step + 1);
          animate(step + 1);
        }, animationSpeed);
      } else {
        setIsAnimating(false);
      }
    };

    animate(0);
  };

  const handleSampleSelect = (sampleText: string) => {
    setInputText(sampleText);
    setSelectedSample("");
    handleReset();
  };

  const exportResults = () => {
    const exportData = {
      model: currentModel.name,
      inputText,
      vocabSize,
      results: bpeResult,
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bpe-results-${currentModel.name.toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentBPEStep = bpeResult.steps[currentStep] || bpeResult.steps[0];
  const progress =
    bpeResult.steps.length > 1
      ? (currentStep / (bpeResult.steps.length - 1)) * 100
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="container mx-auto px-4 py-20 relative">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-6 py-3 mb-8">
              <BookOpen className="w-5 h-5" />
              <span className="text-sm font-medium">
                Advanced Interactive BPE Explorer
              </span>
            </div>
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              Byte Pair Encoding
              <br />
              <span className="text-yellow-300">Playground Pro</span>
            </h1>
            <p className="text-xl text-white/90 max-w-4xl mx-auto mb-8 leading-relaxed">
              Deep dive into tokenization with real-world model implementations.
              Compare GPT-4, BERT, T5, LLaMA tokenizers with advanced
              statistics, compression analysis, and interactive visualizations.
            </p>
            <div className="text-sm text-white/80 mb-6">
              Created by{" "}
              <a
                href="https://www.linkedin.com/in/akaszhu/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-yellow-300 hover:text-yellow-200 transition-colors"
              >
                Akash Chandrasekhar
              </a>{" "}
              • ML Engineer & AI Researcher
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <Button
                variant="outline"
                className={`border-white/20 text-white backdrop-blur-sm ${
                  showStatistics
                    ? "bg-white text-black hover:bg-white/90"
                    : "bg-white/10 hover:bg-white/20"
                }`}
                onClick={() => setShowStatistics(!showStatistics)}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Advanced Analytics
              </Button>
              <Button
                variant="outline"
                className={`transition-colors duration-200 border-white/20 backdrop-blur-sm ${
                  showComparison
                    ? "bg-white text-black hover:bg-white/90"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
                onClick={() => setShowComparison(!showComparison)}
              >
                <GitBranch className="w-4 h-4 mr-2" />
                Model Comparison
              </Button>

              <Button
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                onClick={exportResults}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Results
              </Button>
              <Button
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                asChild
              >
                <a
                  href="https://medium.com/@csakash03/byte-pair-encoding-c4ae347ecdb6"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Read BPE Guide
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Enhanced Model Selection */}
        <Card className="shadow-2xl mb-8 border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Brain className="w-6 h-6 text-blue-600" />
              Select Tokenizer Model
              <Badge
                variant="outline"
                className="ml-2 bg-blue-50 text-blue-700"
              >
                {Object.keys(TOKENIZER_MODELS).length} Models Available
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {TOKENIZER_MODELS.map((model) => {
                const IconComponent = model.icon;
                return (
                  <div
                    key={model.name}
                    onClick={() => setSelectedModel(model.name)}
                    className={`group p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                      selectedModel === model.name
                        ? "border-blue-500 bg-blue-50 shadow-md scale-105"
                        : "border-gray-200 hover:border-blue-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`p-2 rounded-lg ${
                          selectedModel === model.name
                            ? "bg-blue-500 text-white"
                            : "bg-blue-100 text-blue-600"
                        }`}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <span className="font-semibold text-lg">
                        {model.name}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                      {model.description}
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Vocabulary:</span>
                        <span className="font-medium text-blue-600">
                          {model.vocabSize.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Special Tokens:</span>
                        <span className="font-medium">
                          {model.specialTokens.length}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {model.realWorldUsage.slice(0, 2).map((usage, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {usage}
                        </Badge>
                      ))}
                      {model.realWorldUsage.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{model.realWorldUsage.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Model Comparison Panel */}
        {showComparison && (
          <Card className="shadow-xl mb-8 border-0 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-purple-600" />
                Model Technical Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Model</th>
                      <th className="text-left p-3">Preprocessing</th>
                      <th className="text-left p-3">Merge Strategy</th>
                      <th className="text-left p-3">Vocab Size</th>
                      <th className="text-left p-3">Use Cases</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TOKENIZER_MODELS.filter((m) => m.name !== "Custom").map(
                      (model) => (
                        <tr
                          key={model.name}
                          className="border-b hover:bg-white/50"
                        >
                          <td className="p-3 font-medium">{model.name}</td>
                          <td className="p-3 text-gray-600">
                            {model.preprocessing}
                          </td>
                          <td className="p-3 text-gray-600">
                            {model.mergeStrategy}
                          </td>
                          <td className="p-3">
                            {model.vocabSize.toLocaleString()}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {model.realWorldUsage
                                .slice(0, 2)
                                .map((usage, i) => (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {usage}
                                  </Badge>
                                ))}
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* Enhanced Input Section */}
          <Card className="shadow-xl lg:col-span-2 border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-green-600" />
                Input Configuration & Samples
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium">Training Text</label>
                  <Select
                    value={selectedSample}
                    onValueChange={(val) => {
                      handleSampleSelect(val);
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Load sample text" />
                    </SelectTrigger>
                    <SelectContent>
                      {SAMPLE_TEXTS.map((sample) => (
                        <SelectItem key={sample.name} value={sample.text}>
                          {sample.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Enter text to build BPE vocabulary..."
                  className="min-h-[140px] resize-none text-sm"
                />
                <div className="text-xs text-gray-500 mt-2">
                  Characters: {inputText.length} • Words:{" "}
                  {inputText.split(/\s+/).filter((w) => w).length}
                </div>
              </div>

              {selectedModel === "Custom" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Vocabulary Size: {vocabSize.toLocaleString()}
                    </label>
                    <input
                      type="range"
                      min="100"
                      max="10000"
                      step="100"
                      value={vocabSize}
                      onChange={(e) => setVocabSize(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>100</span>
                      <span>5K</span>
                      <span>10K</span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Animation Speed: {animationSpeed}ms per step
                </label>
                <input
                  type="range"
                  min="100"
                  max="3000"
                  step="100"
                  value={animationSpeed}
                  onChange={(e) => setAnimationSpeed(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Fast</span>
                  <span>Medium</span>
                  <span>Slow</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleAnimate}
                  disabled={isAnimating}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex-1"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isAnimating ? "Training..." : "Start Training"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isAnimating}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button variant="outline" onClick={exportResults}>
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Progress Control */}
          <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Training Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Step {currentStep}</span>
                  <span>{bpeResult.steps.length - 1} total</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Manual Step Control
                </label>
                <input
                  type="range"
                  min="0"
                  max={bpeResult.steps.length - 1}
                  value={currentStep}
                  onChange={(e) => setCurrentStep(parseInt(e.target.value))}
                  className="w-full"
                  disabled={isAnimating}
                />
              </div>

              {currentBPEStep.mostFrequentPair && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border">
                  <h4 className="font-medium mb-3 text-blue-700 flex items-center gap-2">
                    <Workflow className="w-4 h-4" />
                    Current Merge Operation
                  </h4>
                  <div className="flex items-center gap-2 text-sm mb-3">
                    <Badge
                      variant="outline"
                      className="bg-blue-100 text-blue-700"
                    >
                      {currentBPEStep.mostFrequentPair[0]}
                    </Badge>
                    <span className="text-gray-400">+</span>
                    <Badge
                      variant="outline"
                      className="bg-blue-100 text-blue-700"
                    >
                      {currentBPEStep.mostFrequentPair[1]}
                    </Badge>
                    <span className="text-gray-400">→</span>
                    <Badge className="bg-blue-600 text-white">
                      {currentBPEStep.mostFrequentPair[0] +
                        currentBPEStep.mostFrequentPair[1]}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>Frequency: {currentBPEStep.frequency} occurrences</div>
                    <div>
                      Compression Ratio:{" "}
                      {currentBPEStep.compressionRatio.toFixed(2)}x
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-600">
                    {currentBPEStep.mergedTokens.length}
                  </div>
                  <div className="text-xs text-green-700 font-medium">
                    Tokens
                  </div>
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">
                    {currentBPEStep.vocabulary.length}
                  </div>
                  <div className="text-xs text-blue-700 font-medium">
                    Vocab Size
                  </div>
                </div>
              </div>

              {/* Compression History Mini Chart */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                <h5 className="text-sm font-medium mb-2 text-purple-700">
                  Compression Progress
                </h5>
                <div className="flex items-end gap-1 h-12">
                  {compressionHistory.slice(0, 20).map((ratio, i) => (
                    <div
                      key={i}
                      className={`flex-1 bg-gradient-to-t from-purple-400 to-purple-600 rounded-sm ${
                        i === currentStep ? "opacity-100" : "opacity-60"
                      }`}
                      style={{
                        height: `${
                          (ratio / Math.max(...compressionHistory)) * 100
                        }%`,
                      }}
                      title={`Step ${i}: ${ratio.toFixed(2)}x`}
                    />
                  ))}
                </div>
                <div className="text-xs text-purple-600 mt-1">
                  Current: {currentBPEStep.compressionRatio.toFixed(2)}x
                  compression
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Statistics Panel */}
        {showStatistics && (
          <Card className="shadow-xl mb-8 border-0 bg-gradient-to-r from-emerald-50 to-teal-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                Advanced Analytics & Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700">
                      Total Merges
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-emerald-600">
                    {bpeResult.statistics.totalMerges}
                  </div>
                  <div className="text-xs text-emerald-600 mt-1">
                    {(
                      (bpeResult.statistics.totalMerges /
                        (bpeResult.steps.length || 1)) *
                      100
                    ).toFixed(1)}
                    % efficiency
                  </div>
                </div>

                <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">
                      Compression Ratio
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {bpeResult.statistics.finalCompressionRatio.toFixed(2)}x
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {(
                      (1 - 1 / bpeResult.statistics.finalCompressionRatio) *
                      100
                    ).toFixed(1)}
                    % size reduction
                  </div>
                </div>

                <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700">
                      Avg Token Length
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-purple-600">
                    {bpeResult.statistics.averageTokenLength.toFixed(1)}
                  </div>
                  <div className="text-xs text-purple-600 mt-1">
                    {bpeResult.statistics.uniqueChars} unique chars
                  </div>
                </div>

                <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-700">
                      Vocab Efficiency
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    {(bpeResult.statistics.vocabularyEfficiency * 100).toFixed(
                      1
                    )}
                    %
                  </div>
                  <div className="text-xs text-orange-600 mt-1">
                    of max vocab used
                  </div>
                </div>
              </div>

              {/* Detailed Statistics Table */}
              <div className="mt-6 bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <LineChart className="w-4 h-4 text-gray-600" />
                  Step-by-Step Analysis
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-2">Step</th>
                        <th className="text-left p-2">Merged Pair</th>
                        <th className="text-left p-2">Frequency</th>
                        <th className="text-left p-2">Tokens</th>
                        <th className="text-left p-2">Vocab Size</th>
                        <th className="text-left p-2">Compression</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bpeResult.steps.slice(0, 10).map((step, i) => (
                        <tr
                          key={i}
                          className={`border-b border-gray-100 ${
                            i === currentStep ? "bg-blue-100" : ""
                          }`}
                        >
                          <td className="p-2 font-medium">{step.iteration}</td>
                          <td className="p-2">
                            {step.mostFrequentPair ? (
                              <span className="text-xs">
                                {step.mostFrequentPair[0]} +{" "}
                                {step.mostFrequentPair[1]}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="p-2">{step.frequency || "-"}</td>
                          <td className="p-2">{step.mergedTokens.length}</td>
                          <td className="p-2">{step.vocabulary.length}</td>
                          <td className="p-2">
                            {step.compressionRatio.toFixed(2)}x
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {bpeResult.steps.length > 10 && (
                  <div className="text-xs text-gray-500 mt-2 text-center">
                    Showing first 10 steps of {bpeResult.steps.length} total
                    steps
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Enhanced Tokenized Output */}
          <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-600" />
                Tokenized Output
                <Badge
                  variant="outline"
                  className="ml-2 bg-orange-50 text-orange-700"
                >
                  Step {currentStep}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-xl border border-gray-200 min-h-[150px]">
                  <div className="flex flex-wrap gap-2">
                    {currentBPEStep.mergedTokens.map((token, index) => {
                      const isSpecialToken =
                        currentModel.specialTokens.includes(token);
                      const isEndToken =
                        token.includes("</w>") || token.includes("##");
                      const isNewlyMerged =
                        currentBPEStep.mostFrequentPair &&
                        token ===
                          currentBPEStep.mostFrequentPair[0] +
                            currentBPEStep.mostFrequentPair[1];

                      return (
                        <Badge
                          key={`${token}-${index}`}
                          variant={
                            isSpecialToken
                              ? "default"
                              : isEndToken
                              ? "secondary"
                              : "outline"
                          }
                          className={`text-xs transition-all duration-300 ${
                            isSpecialToken
                              ? "bg-red-100 text-red-700 border-red-200"
                              : isEndToken
                              ? "bg-blue-100 text-blue-700 border-blue-200"
                              : isNewlyMerged
                              ? "bg-green-100 text-green-700 border-green-300 shadow-md animate-pulse"
                              : "bg-gray-100 text-gray-700 border-gray-200"
                          }`}
                        >
                          {token.replace("</w>", "●").replace("##", "##")}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-700">
                        Efficiency Metrics
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-green-600">
                      <div>
                        Total tokens: {currentBPEStep.mergedTokens.length}
                      </div>
                      <div>
                        Compression:{" "}
                        {currentBPEStep.compressionRatio.toFixed(2)}x
                      </div>
                      <div>
                        Size reduction:{" "}
                        {(
                          (1 - 1 / currentBPEStep.compressionRatio) *
                          100
                        ).toFixed(1)}
                        %
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-700">
                        Token Types
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-blue-600">
                      <div>
                        Special:{" "}
                        {
                          currentBPEStep.mergedTokens.filter((t) =>
                            currentModel.specialTokens.includes(t)
                          ).length
                        }
                      </div>
                      <div>
                        Subwords:{" "}
                        {
                          currentBPEStep.mergedTokens.filter(
                            (t) => t.includes("##") || t.includes("</w>")
                          ).length
                        }
                      </div>
                      <div>
                        Regular:{" "}
                        {
                          currentBPEStep.mergedTokens.filter(
                            (t) =>
                              !currentModel.specialTokens.includes(t) &&
                              !t.includes("##") &&
                              !t.includes("</w>")
                          ).length
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Vocabulary Display */}
          <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-purple-600" />
                Learned Vocabulary
                <Badge
                  variant="outline"
                  className="ml-2 bg-purple-50 text-purple-700"
                >
                  {currentBPEStep.vocabulary.length} tokens
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Base Characters */}
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    Base Characters & Special Tokens (
                    {
                      currentBPEStep.vocabulary.filter(
                        (token) =>
                          token.length === 1 ||
                          currentModel.specialTokens.includes(token)
                      ).length
                    }
                    )
                  </h4>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {currentBPEStep.vocabulary
                        .filter(
                          (token) =>
                            token.length === 1 ||
                            currentModel.specialTokens.includes(token)
                        )
                        .slice(0, 25)
                        .map((token, index) => (
                          <Badge
                            key={`char-${index}`}
                            variant="outline"
                            className={`text-xs ${
                              currentModel.specialTokens.includes(token)
                                ? "bg-red-100 text-red-700 border-red-200"
                                : "bg-blue-100 text-blue-700 border-blue-200"
                            }`}
                          >
                            {currentModel.specialTokens.includes(token)
                              ? token
                              : token === "</w>"
                              ? "●"
                              : token}
                          </Badge>
                        ))}
                      {currentBPEStep.vocabulary.filter(
                        (token) =>
                          token.length === 1 ||
                          currentModel.specialTokens.includes(token)
                      ).length > 25 && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-gray-100 text-gray-600"
                        >
                          +
                          {currentBPEStep.vocabulary.filter(
                            (token) =>
                              token.length === 1 ||
                              currentModel.specialTokens.includes(token)
                          ).length - 25}{" "}
                          more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Learned Subwords */}
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    Learned Subwords (
                    {
                      currentBPEStep.vocabulary.filter(
                        (token) =>
                          token.length > 1 &&
                          !currentModel.specialTokens.includes(token)
                      ).length
                    }
                    )
                  </h4>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {currentBPEStep.vocabulary
                        .filter(
                          (token) =>
                            token.length > 1 &&
                            !currentModel.specialTokens.includes(token)
                        )
                        .slice(0, 20)
                        .map((token, index) => {
                          const isNewlyLearned =
                            currentBPEStep.mostFrequentPair &&
                            token ===
                              currentBPEStep.mostFrequentPair[0] +
                                currentBPEStep.mostFrequentPair[1];
                          return (
                            <Badge
                              key={`merged-${index}`}
                              className={`text-xs transition-all duration-300 ${
                                isNewlyLearned
                                  ? "bg-yellow-200 text-yellow-800 border-yellow-300 animate-pulse shadow-md"
                                  : "bg-green-100 text-green-700 border-green-200"
                              }`}
                            >
                              {token.replace("</w>", "●").replace("##", "##")}
                            </Badge>
                          );
                        })}
                      {currentBPEStep.vocabulary.filter(
                        (token) =>
                          token.length > 1 &&
                          !currentModel.specialTokens.includes(token)
                      ).length > 20 && (
                        <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                          +
                          {currentBPEStep.vocabulary.filter(
                            (token) =>
                              token.length > 1 &&
                              !currentModel.specialTokens.includes(token)
                          ).length - 20}{" "}
                          more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Merging Rules History */}
                {currentBPEStep.mergingRules.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Workflow className="w-4 h-4 text-purple-600" />
                      Recent Merging Rules
                    </h4>
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200 max-h-32 overflow-y-auto">
                      <div className="space-y-1">
                        {currentBPEStep.mergingRules
                          .slice(-5)
                          .reverse()
                          .map((rule, index) => (
                            <div
                              key={index}
                              className="text-xs flex items-center gap-2"
                            >
                              <Badge
                                variant="outline"
                                className="bg-purple-100 text-purple-600 border-purple-200"
                              >
                                {rule.pair[0]}
                              </Badge>
                              <span className="text-purple-400">+</span>
                              <Badge
                                variant="outline"
                                className="bg-purple-100 text-purple-600 border-purple-200"
                              >
                                {rule.pair[1]}
                              </Badge>
                              <span className="text-purple-400">→</span>
                              <Badge className="bg-purple-600 text-white">
                                {rule.newToken}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Enhanced Credits and Resources Section */}
      <div className="mt-12 bg-gradient-to-r from-slate-900 to-blue-900 text-white rounded-2xl p-8 shadow-2xl">
        <h3 className="text-2xl font-bold mb-8 text-center">
          About the Creator & Learning Resources
        </h3>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Creator Info */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">AC</span>
              </div>
              <div>
                <h4 className="font-semibold text-lg">Akash Chandrasekhar</h4>
                <p className="text-white/80 text-sm">
                  ML Engineer & AI Researcher
                </p>
              </div>
            </div>
            <p className="text-white/90 text-sm mb-4 leading-relaxed">
              Passionate about making complex AI concepts accessible through
              interactive tools and educational content. Specializes in NLP,
              transformer architectures, and tokenization algorithms.
            </p>
            <div className="flex gap-3">
              <a
                href="https://www.linkedin.com/in/akaszhu/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-sm transition-colors"
              >
                <Linkedin className="w-4 h-4" />
                LinkedIn
              </a>
              <a
                href="https://medium.com/@csakash03"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg text-sm transition-colors"
              >
                <FileText className="w-4 h-4" />
                Medium
              </a>
            </div>
          </div>

          {/* Blog Article */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-yellow-400" />
              Featured Article
            </h4>
            <div className="space-y-3">
              <a
                href="https://medium.com/@csakash03/byte-pair-encoding-c4ae347ecdb6"
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white/10 hover:bg-white/20 p-4 rounded-lg transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Hash className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h5 className="font-medium group-hover:text-yellow-300 transition-colors">
                      Byte Pair Encoding: A Complete Guide
                    </h5>
                    <p className="text-white/70 text-xs mt-1">
                      Deep dive into BPE algorithm with practical examples and
                      implementation details
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant="outline"
                        className="text-xs bg-white/10 text-white border-white/20"
                      >
                        Medium Article
                      </Badge>
                      <span className="text-white/60 text-xs">by Akash</span>
                    </div>
                  </div>
                </div>
              </a>
            </div>
          </div>

          {/* Interactive Notebooks */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <Code2 className="w-5 h-5 text-orange-400" />
              Interactive Notebooks
            </h4>
            <div className="space-y-3">
              <a
                href="https://colab.research.google.com/github/huggingface/notebooks/blob/master/examples/tokenizer_training.ipynb"
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white/10 hover:bg-white/20 p-3 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M16.9414 4.9757a7.033 7.033 0 0 0-4.9308 2.0324 7.033 7.033 0 0 0-.1232 9.8068 7.033 7.033 0 0 0 9.8068.1232 7.033 7.033 0 0 0 2.0324-4.9308 7.033 7.033 0 0 0-2.0324-4.9308 7.033 7.033 0 0 0-4.8528-2.0008z" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium group-hover:text-orange-300 transition-colors">
                      Tokenizer Training
                    </h5>
                    <p className="text-white/70 text-xs">
                      HuggingFace Official Tutorial
                    </p>
                  </div>
                </div>
              </a>

              <a
                href="https://colab.research.google.com/github/huggingface/notebooks/blob/master/course/en/chapter6/section5.ipynb"
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white/10 hover:bg-white/20 p-3 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M16.9414 4.9757a7.033 7.033 0 0 0-4.9308 2.0324 7.033 7.033 0 0 0-.1232 9.8068 7.033 7.033 0 0 0 9.8068.1232 7.033 7.033 0 0 0 2.0324-4.9308 7.033 7.033 0 0 0-2.0324-4.9308 7.033 7.033 0 0 0-4.8528-2.0008z" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium group-hover:text-purple-300 transition-colors">
                      BPE Deep Dive
                    </h5>
                    <p className="text-white/70 text-xs">
                      Advanced Implementation Guide
                    </p>
                  </div>
                </div>
              </a>

              <div className="mt-4 p-3 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                <div className="flex items-center gap-2 text-yellow-200">
                  <Info className="w-4 h-4" />
                  <span className="text-xs font-medium">Pro Tip</span>
                </div>
                <p className="text-yellow-100 text-xs mt-1">
                  Run these notebooks to experiment with real tokenizer training
                  on your own data!
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-white/80 text-sm">
            This tool is open for educational use. Contribute to the project or
            suggest improvements!
          </p>
          <div className="flex justify-center gap-4 mt-4">
            {/* <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <Share2 className="w-4 h-4 mr-2" /> //
              Share Tool
            </Button> */}
            {/* <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <GitBranch className="w-4 h-4 mr-2" />
              View Source
            </Button> */}
            <div className="text-sm text-white/80 mb-6">
              Created by{" "}
              <a
                href="https://www.linkedin.com/in/akaszhu/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-yellow-300 hover:text-yellow-200 transition-colors"
              >
                Akash Chandrasekhar
              </a>{" "}
              • ML Engineer & AI Researcher
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-8"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BPEPlayground;
