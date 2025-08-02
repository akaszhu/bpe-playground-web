import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Play, RotateCcw, BookOpen } from 'lucide-react';

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

const BPEPlayground = () => {
  const [inputText, setInputText] = useState("low lower newest widest");
  const [vocabSize, setVocabSize] = useState(20);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // BPE Algorithm Implementation
  const computeBPE = (text: string, maxVocabSize: number): BPEResult => {
    // Tokenize into characters and add end-of-word tokens
    const words = text.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    let tokens: string[] = [];
    
    words.forEach(word => {
      const chars = word.split('').concat(['</w>']);
      tokens = tokens.concat(chars);
    });

    // Initialize vocabulary with unique characters
    const vocabulary = [...new Set(tokens)];
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
    for (let iter = 1; iter < maxVocabSize && currentVocabulary.length < maxVocabSize; iter++) {
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
      const newToken = mostFrequentPair[0] + mostFrequentPair[1];
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

  const bpeResult = useMemo(() => computeBPE(inputText, vocabSize), [inputText, vocabSize]);

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
        }, 1000);
      } else {
        setIsAnimating(false);
      }
    };
    
    animate(0);
  };

  const currentBPEStep = bpeResult.steps[currentStep] || bpeResult.steps[0];

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
            Byte Pair Encoding Playground
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Explore how BPE tokenization works step-by-step. Watch as frequent character pairs 
            are merged to build a vocabulary efficiently.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Input Section */}
          <Card className="shadow-soft bg-gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Input Text
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter text to tokenize..."
                className="min-h-[100px] resize-none"
              />
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Max Vocab Size:</label>
                <input
                  type="number"
                  value={vocabSize}
                  onChange={(e) => setVocabSize(parseInt(e.target.value) || 20)}
                  className="w-20 px-2 py-1 border rounded text-sm"
                  min="5"
                  max="50"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleAnimate} 
                  disabled={isAnimating}
                  className="bg-gradient-primary hover:opacity-90"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isAnimating ? 'Animating...' : 'Animate BPE'}
                </Button>
                <Button variant="outline" onClick={handleReset} disabled={isAnimating}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Step Control */}
          <Card className="shadow-soft bg-gradient-card">
            <CardHeader>
              <CardTitle>Step Control</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Step {currentStep} of {bpeResult.steps.length - 1}
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
                  <div className="bg-secondary/50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Current Merge:</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{currentBPEStep.mostFrequentPair[0]}</Badge>
                      <span>+</span>
                      <Badge variant="outline">{currentBPEStep.mostFrequentPair[1]}</Badge>
                      <span>→</span>
                      <Badge className="bg-primary text-primary-foreground">
                        {currentBPEStep.mostFrequentPair[0] + currentBPEStep.mostFrequentPair[1]}
                      </Badge>
                      <span className="text-muted-foreground">
                        (freq: {currentBPEStep.frequency})
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Current Tokens */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Current Tokens</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {currentBPEStep.mergedTokens.map((token, index) => (
                  <Badge 
                    key={`${token}-${index}`}
                    variant={token.includes('</w>') ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {token.replace('</w>', '●')}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                Total tokens: {currentBPEStep.mergedTokens.length}
              </div>
            </CardContent>
          </Card>

          {/* Vocabulary */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Vocabulary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium mb-2">Characters:</h4>
                  <div className="flex flex-wrap gap-1">
                    {currentBPEStep.vocabulary
                      .filter(token => token.length === 1 || token === '</w>')
                      .map((token, index) => (
                        <Badge key={`char-${index}`} variant="outline" className="text-xs">
                          {token === '</w>' ? '●' : token}
                        </Badge>
                      ))}
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2">Merged Tokens:</h4>
                  <div className="flex flex-wrap gap-1">
                    {currentBPEStep.vocabulary
                      .filter(token => token.length > 1 && token !== '</w>')
                      .map((token, index) => (
                        <Badge key={`merged-${index}`} className="text-xs bg-accent text-accent-foreground">
                          {token.replace('</w>', '●')}
                        </Badge>
                      ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                Vocabulary size: {currentBPEStep.vocabulary.length}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BPEPlayground;