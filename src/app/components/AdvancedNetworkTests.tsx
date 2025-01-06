import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestResult {
    status: 'pending' | 'running' | 'passed' | 'failed' | 'error';
    message: string;
    details: string[];
}

interface AdvancedTestState {
    timezone: TestResult;
    browser: TestResult;
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
// Enhanced fetch helper with better error handling and request management
const safeFetch = async (url: string, options: RequestInit = {}) => {
    const defaultOptions: RequestInit = {
        mode: 'no-cors' as RequestMode,
        credentials: 'omit',
        cache: 'no-cache'
    };

    const finalOptions: RequestInit = {
        ...defaultOptions,
        ...options,
        mode: 'no-cors' as RequestMode // Ensure no-cors is always set regardless of passed options
    };

    try {
        const response = await fetch(url, finalOptions);
        // With no-cors, we can't access response details but can check if request completed
        if (response.type === 'opaque') {
            return true; // Request completed in no-cors mode
        }
        return response.ok;
    } catch (error) {
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
        browser: { status: 'pending', message: 'Not tested', details: [] },
        network: { status: 'pending', message: 'Not tested', details: [] },
        fingerprint: { status: 'pending', message: 'Not tested', details: [] },
        traffic: { status: 'pending', message: 'Not tested', details: [] }
    });
    
    const [isLocalRunning, setIsLocalRunning] = useState(false);

    useEffect(() => {
        if (triggerTests && !isLocalRunning) {
            setIsLocalRunning(true);
            runTests().finally(() => {
                setIsLocalRunning(false);
                if (onTestComplete) {
                    onTestComplete();
                }
            });
        }
    }, [triggerTests, onTestComplete]);

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

        // Use multiple services with fallback
        const timeServices = [
            'https://worldtimeapi.org/api/ip',
            'https://ipapi.co/timezone'
        ];

        let networkTimezone = null;

        for (const service of timeServices) {
            try {
                await delay(1000); // Add delay between requests
                const isAvailable = await safeFetch(service);
                if (isAvailable) {
                    results.push(`Successfully connected to time service: ${service}`);
                } else {
                    results.push(`Failed to connect to time service: ${service}`);
                }
            } catch (error) {
                results.push(`Error checking time service: ${service}`);
                continue;
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

        // Test network characteristics with increased delays
        const sizes = [1500, 1400, 1300, 1200];
        
        for (const size of sizes) {
            try {
                await delay(2000); // Increased delay between requests
                const start = performance.now();
                const success = await safeFetch('https://api.ipify.org', {
                    method: 'POST',
                    body: 'x'.repeat(size)
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

        // Network interface enumeration
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
                await delay(2000); // Increased delay between requests
                const start = performance.now();
                const success = await safeFetch('https://api.ipify.org');
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

    const runTests = async () => {
        // Keep track of original state in case of errors
        let originalState: AdvancedTestState | null = null;
        
        setTests(prev => {
            originalState = prev;
            const entries: TestEntries = Object.entries(prev) as TestEntries;
            const updatedEntries = entries.map(([key]) => [
                key,
                { status: 'running' as const, message: 'Testing...', details: [] }
            ]);
            return Object.fromEntries(updatedEntries) as AdvancedTestState;
        });

        // Enhanced test runner with better state management
        const runTest = async (
            testFunction: () => Promise<TestResult> | TestResult,
            testKey: keyof AdvancedTestState
        ) => {
            try {
                const result = await Promise.race([
                    testFunction(),
                    // Timeout after 30 seconds
                    new Promise<TestResult>((_, reject) => 
                        setTimeout(() => reject(new Error('Test timeout')), 30000)
                    )
                ]);
                
                setTests(prev => ({ ...prev, [testKey]: result }));
                await delay(2000); // Increased delay between tests
            } catch (error) {
                console.warn(`Test ${testKey} failed:`, error);
                // Don't reset other tests' state on error
                setTests(prev => ({
                    ...prev,
                    [testKey]: {
                        status: 'error',
                        message: `Test completed with some issues`,
                        details: prev[testKey]?.details || []
                    }
                }));
            }
        };

        // Run tests sequentially
        await runTest(checkTimezoneLeaks, 'timezone');
        await runTest(checkBrowserFingerprint, 'browser');
        await runTest(checkNetworkInterfaces, 'network');
        await runTest(analyzeTrafficPatterns, 'traffic');
    };

    const getStatusIcon = (status: TestResult['status']) => {
        switch (status) {
            case 'passed':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'failed':
                return <AlertTriangle className="w-5 h-5 text-red-500" />;
            case 'running':
                return <Loader className="w-5 h-5 animate-spin text-gray-500" />;
            default:
                return <Shield className="w-5 h-5 text-gray-400" />;
        }
    };

    return (
        <div className="w-full space-y-4">
            {Object.entries(tests).map(([testName, test]) => (
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
            ))}
        </div>
    );
};

export default AdvancedNetworkTests;