import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Play, RotateCcw, BookOpen, Settings2, Brain, Eye, Zap, GitBranch, Linkedin, FileText } from 'lucide-react';

interface BPEStep {
  iteration: number;
  mostFrequentPair: [string, string] | null;
  frequency: number;
  vocabulary: string[];
  mergedTokens: string[];
}

interface BPEResult {
  steps: BPEStep[];
  finalTokens: string[];
  finalVocabulary: string[];
}

interface TokenizerModel {
  name: string;
  description: string;
  vocabSize: number;
  specialTokens: string[];
  icon: typeof Brain;
}

const TOKENIZER_MODELS: TokenizerModel[] = [
  {
    name: "GPT-2",
    description: "OpenAI's GPT-2 BPE tokenizer with 50,257 vocab size",
    vocabSize: 50257,
    specialTokens: ["<|endoftext|>"],
    icon: Brain
  },
  {
    name: "GPT-3/4",
    description: "GPT-3 and GPT-4 tokenizer with enhanced vocabulary",
    vocabSize: 50256,
    specialTokens: ["<|endoftext|>", "<|startoftext|>"],
    icon: Zap
  },
  {
    name: "BERT",
    description: "BERT WordPiece tokenizer (similar to BPE)",
    vocabSize: 30522,
    specialTokens: ["[CLS]", "[SEP]", "[PAD]", "[UNK]", "[MASK]"],
    icon: GitBranch
  },
  {
    name: "Custom",
    description: "Create your own BPE tokenizer with custom settings",
    vocabSize: 1000,
    specialTokens: ["</w>"],
    icon: Settings2
  }
];

const BPEPlayground = () => {
  const [inputText, setInputText] = useState("attention is all you need transformer architecture");
  const [selectedModel, setSelectedModel] = useState("Custom");
  const [vocabSize, setVocabSize] = useState(1000);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1000);

  const currentModel = TOKENIZER_MODELS.find(m => m.name === selectedModel) || TOKENIZER_MODELS[3];

  // Update vocab size when model changes
  useEffect(() => {
    if (selectedModel !== "Custom") {
      setVocabSize(currentModel.vocabSize);
    }
  }, [selectedModel, currentModel.vocabSize]);

  // Enhanced BPE Algorithm Implementation
  const computeBPE = (text: string, maxVocabSize: number, model: TokenizerModel): BPEResult => {
    // Preprocessing based on model type
    let processedText = text.toLowerCase();
    
    if (model.name.includes("GPT")) {
      // GPT-style preprocessing
      processedText = text; // Keep original casing for GPT
    } else if (model.name === "BERT") {
      // BERT-style preprocessing
      processedText = text.toLowerCase().replace(/[^\w\s]/g, ' ');
    }

    // Tokenize into characters and add end-of-word tokens
    const words = processedText.split(/\s+/).filter(word => word.length > 0);
    let tokens: string[] = [];
    
    words.forEach(word => {
      if (model.name === "BERT") {
        // BERT uses ## for subwords
        const chars = word.split('');
        tokens = tokens.concat(chars.map((char, i) => i === 0 ? char : `##${char}`));
      } else {
        // BPE uses </w> for end of word
        const chars = word.split('').concat(['</w>']);
        tokens = tokens.concat(chars);
      }
    });

    // Add special tokens to vocabulary
    const vocabulary = [...new Set([...tokens, ...model.specialTokens])];
    const steps: BPEStep[] = [];

    // Initial step
    steps.push({
      iteration: 0,
      mostFrequentPair: null,
      frequency: 0,
      vocabulary: [...vocabulary],
      mergedTokens: [...tokens]
    });

    let currentTokens = [...tokens];
    let currentVocabulary = [...vocabulary];

    // BPE iterations
    const maxIterations = Math.min(maxVocabSize - vocabulary.length, 50); // Limit for demo
    
    for (let iter = 1; iter <= maxIterations && currentVocabulary.length < maxVocabSize; iter++) {
      // Count pair frequencies
      const pairCounts: Map<string, number> = new Map();
      
      for (let i = 0; i < currentTokens.length - 1; i++) {
        const pair = `${currentTokens[i]} ${currentTokens[i + 1]}`;
        pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
      }

      if (pairCounts.size === 0) break;

      // Find most frequent pair
      let mostFrequentPair: [string, string] | null = null;
      let maxFreq = 0;

      for (const [pair, freq] of pairCounts.entries()) {
        if (freq > maxFreq) {
          maxFreq = freq;
          mostFrequentPair = pair.split(' ') as [string, string];
        }
      }

      if (!mostFrequentPair || maxFreq < 2) break;

      // Merge the most frequent pair
      const newToken = model.name === "BERT" && mostFrequentPair[1].startsWith('##')
        ? mostFrequentPair[0] + mostFrequentPair[1].substring(2)
        : mostFrequentPair[0] + mostFrequentPair[1];
      
      const newTokens: string[] = [];
      
      for (let i = 0; i < currentTokens.length; i++) {
        if (i < currentTokens.length - 1 && 
            currentTokens[i] === mostFrequentPair[0] && 
            currentTokens[i + 1] === mostFrequentPair[1]) {
          newTokens.push(newToken);
          i++; // Skip next token as it's part of the merge
        } else {
          newTokens.push(currentTokens[i]);
        }
      }

      currentTokens = newTokens;
      currentVocabulary.push(newToken);

      steps.push({
        iteration: iter,
        mostFrequentPair,
        frequency: maxFreq,
        vocabulary: [...currentVocabulary],
        mergedTokens: [...currentTokens]
      });
    }

    return {
      steps,
      finalTokens: currentTokens,
      finalVocabulary: currentVocabulary
    };
  };

  const bpeResult = useMemo(() => computeBPE(inputText, vocabSize, currentModel), [inputText, vocabSize, currentModel]);

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

  const currentBPEStep = bpeResult.steps[currentStep] || bpeResult.steps[0];
  const progress = bpeResult.steps.length > 1 ? (currentStep / (bpeResult.steps.length - 1)) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Header */}
      <div className="bg-gradient-hero text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <BookOpen className="w-4 h-4" />
              <span className="text-sm">Interactive BPE Explorer</span>
            </div>
            <h1 className="text-5xl font-bold mb-6">
              Byte Pair Encoding
              <br />
              <span className="text-primary-light">Playground</span>
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto mb-8">
              Explore how different language models tokenize text through interactive BPE visualization. 
              Compare GPT, BERT, and custom tokenizers with real-time step-by-step analysis.
            </p>
            <div className="text-sm text-white/80">
              Created by <span className="font-medium">Interactive AI Architecture Explorer</span> • Educational Tool
            </div>
            <div className="flex justify-center gap-4 mt-6">
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Linkedin className="w-4 h-4 mr-2" />
                Connect on LinkedIn
              </Button>
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <FileText className="w-4 h-4 mr-2" />
                Read Documentation
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Model Selection */}
        <Card className="shadow-elegant mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Select Tokenizer Model
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {TOKENIZER_MODELS.map((model) => {
                const IconComponent = model.icon;
                return (
                  <div
                    key={model.name}
                    onClick={() => setSelectedModel(model.name)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedModel === model.name
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <IconComponent className="w-5 h-5 text-primary" />
                      <span className="font-medium">{model.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{model.description}</p>
                    <div className="text-xs text-primary">
                      Vocab: {model.vocabSize.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Input Section */}
          <Card className="shadow-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Input Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Training Text</label>
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Enter text to build BPE vocabulary..."
                  className="min-h-[120px] resize-none"
                />
              </div>
              
              {selectedModel === "Custom" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Vocabulary Size: {vocabSize.toLocaleString()}
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="5000"
                    step="100"
                    value={vocabSize}
                    onChange={(e) => setVocabSize(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Animation Speed: {animationSpeed}ms per step
                </label>
                <input
                  type="range"
                  min="200"
                  max="2000"
                  step="200"
                  value={animationSpeed}
                  onChange={(e) => setAnimationSpeed(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleAnimate} 
                  disabled={isAnimating}
                  className="bg-gradient-hero hover:opacity-90 flex-1"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isAnimating ? 'Running...' : 'Start Training'}
                </Button>
                <Button variant="outline" onClick={handleReset} disabled={isAnimating}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Progress Control */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Training Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Step {currentStep}</span>
                  <span>{bpeResult.steps.length - 1} total</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Manual Step Control</label>
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
                <div className="bg-gradient-card p-4 rounded-lg border">
                  <h4 className="font-medium mb-3 text-primary">Current Merge Operation</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="bg-primary/10">
                      {currentBPEStep.mostFrequentPair[0]}
                    </Badge>
                    <span className="text-muted-foreground">+</span>
                    <Badge variant="outline" className="bg-primary/10">
                      {currentBPEStep.mostFrequentPair[1]}
                    </Badge>
                    <span className="text-muted-foreground">→</span>
                    <Badge className="bg-primary text-primary-foreground">
                      {currentBPEStep.mostFrequentPair[0] + currentBPEStep.mostFrequentPair[1]}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Frequency: {currentBPEStep.frequency} occurrences
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-gradient-card p-3 rounded-lg border">
                  <div className="text-2xl font-bold text-primary">
                    {currentBPEStep.mergedTokens.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Tokens</div>
                </div>
                <div className="bg-gradient-card p-3 rounded-lg border">
                  <div className="text-2xl font-bold text-accent">
                    {currentBPEStep.vocabulary.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Vocab Size</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Current Tokens */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Tokenized Output
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 p-4 bg-gradient-card rounded-lg border min-h-[120px]">
                  {currentBPEStep.mergedTokens.map((token, index) => {
                    const isSpecialToken = currentModel.specialTokens.includes(token);
                    const isEndToken = token.includes('</w>') || token.includes('##');
                    
                    return (
                      <Badge 
                        key={`${token}-${index}`}
                        variant={isSpecialToken ? "default" : isEndToken ? "secondary" : "outline"}
                        className={`text-xs transition-all ${
                          isSpecialToken ? "bg-accent text-accent-foreground" :
                          isEndToken ? "bg-primary/10 text-primary" : ""
                        }`}
                      >
                        {token.replace('</w>', '●').replace('##', '##')}
                      </Badge>
                    );
                  })}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total tokens: {currentBPEStep.mergedTokens.length} • 
                  Compression ratio: {((inputText.length / currentBPEStep.mergedTokens.length) * 100).toFixed(1)}%
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vocabulary */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-primary" />
                Learned Vocabulary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-primary/20"></span>
                    Base Characters ({currentBPEStep.vocabulary.filter(token => 
                      token.length === 1 || currentModel.specialTokens.includes(token)
                    ).length})
                  </h4>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {currentBPEStep.vocabulary
                      .filter(token => token.length === 1 || currentModel.specialTokens.includes(token))
                      .slice(0, 20)
                      .map((token, index) => (
                        <Badge key={`char-${index}`} variant="outline" className="text-xs bg-primary/5">
                          {currentModel.specialTokens.includes(token) ? token : 
                           token === '</w>' ? '●' : token}
                        </Badge>
                      ))}
                    {currentBPEStep.vocabulary.filter(token => 
                      token.length === 1 || currentModel.specialTokens.includes(token)
                    ).length > 20 && (
                      <Badge variant="outline" className="text-xs">
                        +{currentBPEStep.vocabulary.filter(token => 
                          token.length === 1 || currentModel.specialTokens.includes(token)
                        ).length - 20} more
                      </Badge>
                    )}
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-accent/20"></span>
                    Learned Subwords ({currentBPEStep.vocabulary.filter(token => 
                      token.length > 1 && !currentModel.specialTokens.includes(token)
                    ).length})
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {currentBPEStep.vocabulary
                      .filter(token => token.length > 1 && !currentModel.specialTokens.includes(token))
                      .slice(0, 15)
                      .map((token, index) => (
                        <Badge key={`merged-${index}`} className="text-xs bg-accent/20 text-accent-foreground border-accent/30">
                          {token.replace('</w>', '●').replace('##', '##')}
                        </Badge>
                      ))}
                    {currentBPEStep.vocabulary.filter(token => 
                      token.length > 1 && !currentModel.specialTokens.includes(token)
                    ).length > 15 && (
                      <Badge className="text-xs bg-accent/20 text-accent-foreground">
                        +{currentBPEStep.vocabulary.filter(token => 
                          token.length > 1 && !currentModel.specialTokens.includes(token)
                        ).length - 15} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Credits and Resources Section */}
      <div className="mt-8 p-6 bg-card rounded-lg border border-border">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Credits & Resources</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Credits */}
          <div>
            <h4 className="font-medium mb-3 text-muted-foreground">Created by</h4>
            <div className="space-y-2">
              <p className="text-sm text-foreground">
                Inspired by educational content from researchers and practitioners in the field of NLP tokenization.
              </p>
              <p className="text-sm text-muted-foreground">
                Implementation based on modern tokenization research and practical applications.
              </p>
            </div>
          </div>

          {/* Interactive Resources */}
          <div>
            <h4 className="font-medium mb-3 text-muted-foreground">Interactive Learning</h4>
            <div className="space-y-3">
              <a 
                href="https://colab.research.google.com/github/huggingface/notebooks/blob/master/examples/tokenizer_training.ipynb"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.9414 4.9757a7.033 7.033 0 0 0-4.9308 2.0324 7.033 7.033 0 0 0-.1232 9.8068 7.033 7.033 0 0 0 9.8068.1232 7.033 7.033 0 0 0 2.0324-4.9308 7.033 7.033 0 0 0-2.0324-4.9308 7.033 7.033 0 0 0-4.8528-2.0008z" />
                </svg>
                Tokenizer Training Notebook
              </a>
              
              <a 
                href="https://colab.research.google.com/github/huggingface/notebooks/blob/master/course/en/chapter6/section5.ipynb"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.9414 4.9757a7.033 7.033 0 0 0-4.9308 2.0324 7.033 7.033 0 0 0-.1232 9.8068 7.033 7.033 0 0 0 9.8068.1232 7.033 7.033 0 0 0 2.0324-4.9308 7.033 7.033 0 0 0-2.0324-4.9308 7.033 7.033 0 0 0-4.8528-2.0008z" />
                </svg>
                BPE Deep Dive Tutorial
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BPEPlayground;