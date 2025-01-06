import React, { useState, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestResult {
    status: 'pending' | 'running' | 'passed' | 'failed' | 'error';
    message: string;
    details: string[];
}

interface AdvancedTestState {
    timezone: TestResult;
    network: TestResult;
    fingerprint: TestResult;
    traffic: TestResult;
}

type TestEntries = [keyof AdvancedTestState, TestResult][];

interface AdvancedNetworkTestsProps {
    isRunning: boolean;
    onTestComplete?: () => void;
    triggerTests?: boolean;
    addLog: (message: string) => void;
}

// Helper function for controlled delays between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced fetch with no-cors mode and better error handling
const safeFetch = async (url: string, options: RequestInit = {}): Promise<boolean> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const defaultOptions: RequestInit = {
         mode: 'no-cors' as RequestMode,
        credentials: 'omit',
        cache: 'no-cache',
        signal: controller.signal
    };

    try {
        const response = await fetch(url, {
            ...defaultOptions,
            ...options,
           mode: 'no-cors' as RequestMode
        });
        clearTimeout(timeoutId);
        return response.type === 'opaque' ? true : response.ok;
    } catch (error) {
        clearTimeout(timeoutId);
         console.warn(`Request to ${url} failed:`, error);
        return false;
    }
};

const AdvancedNetworkTests: React.FC<AdvancedNetworkTestsProps> = ({
    isRunning,
    onTestComplete,
    triggerTests,
    addLog
}) => {
    const [tests, setTests] = useState<AdvancedTestState>({
        timezone: { status: 'pending', message: 'Not tested', details: [] },
        network: { status: 'pending', message: 'Not tested', details: [] },
        fingerprint: { status: 'pending', message: 'Not tested', details: [] },
        traffic: { status: 'pending', message: 'Not tested', details: [] }
    });
    
     const [isLocalRunning, setIsLocalRunning] = useState(false);

    // Component mount logging
     useEffect(() => {
         addLog('[LIFECYCLE] AdvancedNetworkTests component mounted');
        return () => {
             addLog('[LIFECYCLE] AdvancedNetworkTests component unmounting');
        };
    }, [addLog]); // Empty deps = only on mount/unmount

  
  const timeServices = [
    { url: 'https://httpbin.org/get', name: 'HTTP Bin Get' },
    { url: 'https://httpbin.org/status/200', name: 'HTTP Bin Status' }
];

    const checkTimezoneLeaks = async (): Promise<TestResult> => {
        addLog('Starting timezone leak detection...');
        const results: string[] = [];
        const leaks: string[] = [];

        const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        results.push(`System timezone: ${systemTimezone}`);

        const offset = new Date().getTimezoneOffset();
        results.push(`UTC offset: ${offset} minutes`);

        const dateStr = new Date().toLocaleString();
        results.push(`Locale date string: ${dateStr}`);

        let networkTimezone = null;

      for (const service of timeServices) {
          try {
              await delay(1000);
              const response = await safeFetch(service.url);
             results.push(
                    response 
                        ? `Successfully connected to time service: ${service.name}`
                        : `Failed to connect to time service: ${service.name}`
                );
          } catch (error) {
              results.push(`Error checking time service: ${service.name}`);
          }
      }

        return {
            status: leaks.length > 0 ? 'failed' : 'passed',
            message: leaks.length > 0 ? 'Timezone leaks detected' : 'No timezone leaks detected',
            details: [...results, ...leaks]
        };
    };


    const checkBrowserFingerprint = (): TestResult => {
        addLog('Starting browser fingerprint analysis...');
        const results: string[] = [];
        const leaks: string[] = [];

        // Language checks
        const languages = navigator.languages || [navigator.language];
        results.push(`Browser languages: ${languages.join(', ')}`);

        // Platform info
        results.push(`Platform: ${navigator.platform}`);

        // Screen resolution
        const resolution = `${window.screen.width}x${window.screen.height}`;
        results.push(`Screen resolution: ${resolution}`);

        // Color depth
        results.push(`Color depth: ${window.screen.colorDepth}`);

        // Check timezone consistency
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        results.push(`Timezone: ${timeZone}`);

        // Check for WebGL fingerprinting
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                    results.push(`WebGL Vendor: ${vendor}`);
                    results.push(`WebGL Renderer: ${renderer}`);
                }
            }
        } catch (error) {
            addLog('Error checking WebGL fingerprint');
        }

        // Check for inconsistencies
        if (languages.some(lang => !lang.startsWith(navigator.language.split('-')[0])) ||
            timeZone.includes('UTC')) {
            leaks.push('Inconsistent browser locale settings detected');
        }

        return {
            status: leaks.length > 0 ? 'failed' : 'passed',
            message: leaks.length > 0 ? 'Browser fingerprint inconsistencies detected' : 'Browser fingerprint analysis complete',
            details: [...results, ...leaks]
        };
    };

   const checkNetworkInterfaces = async (): Promise<TestResult> => {
        addLog('Starting network interface analysis...');
        const results: string[] = [];
        const leaks: string[] = [];

        // Part 1: Packet size testing
        const packetSizes = [1500, 1400, 1300, 1200];
        for (const size of packetSizes) {
            try {
                await delay(2000);
                const payload = new URLSearchParams();
                payload.append('data', 'x'.repeat(size));
                
                const start = performance.now();
               const success = await safeFetch('https://httpbin.org/post', {
                    method: 'POST',
                    body: payload.toString(),
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                      mode: 'no-cors' as RequestMode
                });
                const end = performance.now();
                const time = end - start;

                if (success) {
                    results.push(`Packet size ${size}: ${time.toFixed(2)}ms`);
                    if (time > 100) {
                        leaks.push(`Possible MTU fragmentation at ${size} bytes`);
                    }
                } else {
                    results.push(`Failed to test packet size ${size}`);
                }
            } catch (error) {
                results.push(`Error testing packet size ${size}`);
            }
        }

        // Part 2: Connection testing
        const testUrls = [
            'https://httpbin.org/get',
            'https://httpbin.org/status/200',
            'https://httpbin.org/delay/1'
        ];
        
        for (const url of testUrls) {
            try {
                await delay(2000);
                const start = performance.now();
                 const success = await safeFetch(url, {
                    method: 'GET',
                     mode: 'no-cors' as RequestMode
                });
                const end = performance.now();
                const time = end - start;

                if (success) {
                    results.push(`Request to ${url}: ${time.toFixed(2)}ms`);
                    if (time > 100) {
                        leaks.push(`High latency detected for ${url}`);
                    }
                } else {
                    results.push(`Failed to connect to ${url}`);
                }
            } catch (error) {
                results.push(`Error testing ${url}`);
            }
        }

        // Part 3: Network interface enumeration
        if ('connection' in navigator) {
            const connection = (navigator as any).connection;
            if (connection) {
                results.push(`Connection type: ${connection.type || 'unknown'}`);
                results.push(`Effective type: ${connection.effectiveType || 'unknown'}`);
                results.push(`Downlink: ${connection.downlink || 'unknown'} Mbps`);
                results.push(`RTT: ${connection.rtt || 'unknown'} ms`);
            }
        }

        return {
            status: leaks.length > 0 ? 'failed' : 'passed',
            message: leaks.length > 0 ? 'Network anomalies detected' : 'Network analysis complete',
            details: [...results, ...leaks]
        };
    };

     const analyzeTrafficPatterns = async (): Promise<TestResult> => {
        addLog('Starting traffic pattern analysis...');
        const results: string[] = [];
        const leaks: string[] = [];
        const measurements: number[] = [];

        // Test latency patterns with increased delays
        for (let i = 0; i < 5; i++) {
            try {
                await delay(2000);
                const start = performance.now();
                const success = await safeFetch('https://httpbin.org/get');
                 const time = performance.now() - start;
                
                if (success) {
                    measurements.push(time);
                    results.push(`Request ${i + 1} latency: ${time.toFixed(2)}ms`);
                } else {
                    results.push(`Request ${i + 1} failed`);
                }
            } catch (error) {
                results.push(`Error in request ${i + 1}`);
            }
        }

        if (measurements.length > 0) {
            const avgLatency = measurements.reduce((a, b) => a + b, 0) / measurements.length;
            const stdDev = Math.sqrt(
                measurements.reduce((a, b) => a + Math.pow(b - avgLatency, 2), 0) / measurements.length
            );

            results.push(`Average latency: ${avgLatency.toFixed(2)}ms`);
            results.push(`Latency standard deviation: ${stdDev.toFixed(2)}ms`);

            if (avgLatency > 100) {
                leaks.push('High average latency detected - possible VPN usage');
            }
            if (stdDev > 50) {
                leaks.push('High latency variation detected - possible VPN usage');
            }
        }

        return {
            status: leaks.length > 0 ? 'failed' : 'passed',
            message: leaks.length > 0 ? 'Traffic anomalies detected' : 'Traffic analysis complete',
            details: [...results, ...leaks]
        };
    };

    const runTest = useCallback(async (
        testFunction: () => Promise<TestResult> | TestResult,
        testKey: keyof AdvancedTestState
    ) => {
        if (tests[testKey].status === 'passed' || tests[testKey].status === 'failed') {
            return;
        }

        addLog(`=== Starting test: ${testKey} ===`);

          // Store initial details before running the test
         const initialState = tests[testKey];
        try {
            setTests(prev => ({
                ...prev,
                [testKey]: { status: 'running', message: 'Testing...', details: [] }
            }));

            const result = await Promise.race([
                testFunction(),
                 new Promise<TestResult>((_, reject) =>
                     setTimeout(() => reject(new Error('Test timeout')), 30000)
                )
            ]);

              setTests(prev => ({
                ...prev,
                [testKey]: result
            }));
            await delay(2000);
        } catch (error) {
             setTests(prev => ({
                    ...prev,
                    [testKey]: {
                        status: 'error',
                        message: `Test completed with some issues`,
                        details: initialState?.details || ['An error occurred during testing']
                    }
                }));
        }
    }, [tests, addLog]);


    const runTests = useCallback(async () => {
        const currentState = { ...tests };

        setTests(prev => {
            const updatedTests = { ...prev };
            Object.keys(updatedTests).forEach((key) => {
                if (updatedTests[key as keyof AdvancedTestState].status === 'pending') {
                    updatedTests[key as keyof AdvancedTestState] = {
                        status: 'running',
                        message: 'Testing...',
                        details: []
                    };
                }
            });
            return updatedTests;
        });

        try {
            if (currentState.timezone.status === 'pending') {
                await runTest(checkTimezoneLeaks, 'timezone');
            }
            if (currentState.network.status === 'pending') {
                await runTest(checkNetworkInterfaces, 'network');
            }
            if (currentState.fingerprint.status === 'pending') {
                await runTest(checkBrowserFingerprint, 'fingerprint');
            }
            if (currentState.traffic.status === 'pending') {
                await runTest(analyzeTrafficPatterns, 'traffic');
            }

             setIsLocalRunning(false);
              if (onTestComplete) {
                    onTestComplete();
            }
        } catch (error) {
            addLog(`Test sequence failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
           setIsLocalRunning(false);
                if (onTestComplete) {
                    onTestComplete();
            }
        }
    }, [tests, runTest, onTestComplete, addLog]);


    // Modify the trigger effect
    useEffect(() => {
          if (triggerTests && !isLocalRunning) {
              addLog('[TRIGGER] Starting advanced tests sequence');
             setIsLocalRunning(true);
             runTests();
          }
     }, [triggerTests, isLocalRunning, runTests, addLog]);

      const getStatusIcon = (status: TestResult['status']) => {
            switch (status) {
                case 'passed':
                    return <CheckCircle className="w-5 h-5 text-green-500" />;
                case 'failed':
                case 'error':
                    return <AlertTriangle className="w-5 h-5 text-red-500" />;
                case 'running':
                case 'pending':
                   return <Loader className="w-5 h-5 animate-spin text-gray-500" />;
                default:
                    return <Loader className="w-5 h-5 animate-spin text-gray-500" />;
            }
    };


    const TestDisplay = Object.entries(tests).map(([testName, test]) => {
        return (
             <div
                key={testName}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
                <div className="flex items-center gap-4 mb-2">
                    {getStatusIcon(test.status)}
                    <div className="flex-1">
                        <h3 className="font-mono font-medium uppercase tracking-wide">
                           {testName.charAt(0).toUpperCase() + testName.slice(1)} Test
                        </h3>
                        <p className="text-sm text-gray-600">{test.message}</p>
                    </div>
                </div>
                {test.details && test.details.length > 0 && (
                    <div className="ml-9 mt-2 text-sm text-gray-600 font-mono">
                        {test.details.map((detail: string, index: number) => (
                            <div key={index} className="mb-1">{detail}</div>
                        ))}
                    </div>
                )}
             </div>
        );
    });

    return <div className="w-full space-y-4">{TestDisplay}</div>;
};

export default AdvancedNetworkTests;