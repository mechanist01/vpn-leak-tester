import React, { useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, Loader } from 'lucide-react';

interface TLSTestResult {
  version: string;
  cipher_suite: {
    name: string;
    protocol: string;
    bits: number;
  };
  cert_info: {
    subject: string;
    issuer: string;
    not_valid_before: string;
    not_valid_after: string;
    serial_number: number;
  };
}

const TLSFingerprintTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TLSTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = 'https://vlt-be-mechanist01.replit.app';

  const checkTLSFingerprint = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/analyze-tls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: window.location.hostname
        })
      });

      if (!response.ok) {
        throw new Error('TLS test request failed');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError('Failed to check TLS configuration');
      console.error('TLS test error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (isLoading) return <Loader className="animate-spin" />;
    if (error) return <AlertTriangle />;
    if (results) return <CheckCircle />;
    return <RefreshCw />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-4">
      <div className="tool-section terminal-style">
        <div className="tool-header">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <div>
              <h3 className="text-lg font-semibold">TLS/SSL Test</h3>
              <p className="text-sm opacity-90">
                {isLoading ? 'Analyzing TLS/SSL configuration...' :
                 error ? error :
                 results ? 'Analysis complete' :
                 'Click the button to analyze your TLS/SSL connection'}
              </p>
            </div>
          </div>
        </div>

        {results && (
          <div className="test-details mt-4 space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">TLS Test Results</h4>
              <div className="opacity-85">Version → {results.version}</div>
              <div className="opacity-85">Cipher Suite → {results.cipher_suite.name}</div>
              <div className="opacity-85">Protocol → {results.cipher_suite.protocol}</div>
              <div className="opacity-85">Bits → {results.cipher_suite.bits}</div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Certificate Information</h4>
              <div className="opacity-85">Subject → {results.cert_info.subject}</div>
              <div className="opacity-85">Issuer → {results.cert_info.issuer}</div>
              <div className="opacity-85">Valid From → {formatDate(results.cert_info.not_valid_before)}</div>
              <div className="opacity-85">Valid To → {formatDate(results.cert_info.not_valid_after)}</div>
              <div className="opacity-85">Serial → {results.cert_info.serial_number}</div>
            </div>
          </div>
        )}
        
        <div className="mt-4">
          <button
            onClick={checkTLSFingerprint}
            disabled={isLoading}
            className="tool-button w-full"
          >
            {isLoading ? 'Analyzing TLS/SSL...' : results ? 'Test Again' : 'Start TLS/SSL Test'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TLSFingerprintTest;