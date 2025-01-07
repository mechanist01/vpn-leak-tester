import React, { useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TLSTestResult {
  userAgent: string;
  securityHeaders: Record<string, string>;
  tlsVersion?: string;
  cipherSuite?: string;
  certificateInfo?: {
    issuer?: string;
    validFrom?: string;
    validTo?: string;
    commonName?: string;
    altNames?: string[];
  };
  supportedProtocols?: string[];
  supportedCiphers?: string[];
}

const TLSFingerprintTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TLSTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchWithTimeout = async (url: string, options = {}) => {
    const timeout = 5000; // 5 seconds timeout
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  };

  const checkTLSFingerprint = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get TLS info from multiple sources
      const [mainResponse, sslLabsResponse] = await Promise.all([
        fetchWithTimeout('https://www.howsmyssl.com/a/check', {
          headers: {
            'Accept': 'application/json',
          }
        }),
        fetchWithTimeout('https://api.ssllabs.com/api/v3/info', {
          headers: {
            'Accept': 'application/json',
          }
        })
      ]);

      const mainData = await mainResponse.json();
      const sslLabsData = await sslLabsResponse.json();

      const securityHeaders: Record<string, string> = {};
      mainResponse.headers.forEach((value, key) => {
        if (key.toLowerCase().includes('security') || 
            key.toLowerCase().includes('strict') ||
            key.toLowerCase().includes('ssl') ||
            key.toLowerCase().includes('tls')) {
          securityHeaders[key] = value;
        }
      });

      // Test TLS connection capabilities
      const capabilities = {
        tls13: await testTLSVersion('1.3'),
        tls12: await testTLSVersion('1.2'),
        tls11: await testTLSVersion('1.1')
      };

      setResults({
        userAgent: navigator.userAgent,
        securityHeaders,
        tlsVersion: mainData.tls_version,
        cipherSuite: mainData.cipher_suite,
        supportedProtocols: [
          ...(capabilities.tls13 ? ['TLS 1.3'] : []),
          ...(capabilities.tls12 ? ['TLS 1.2'] : []),
          ...(capabilities.tls11 ? ['TLS 1.1'] : [])
        ],
        supportedCiphers: mainData.given_cipher_suites,
        certificateInfo: {
          issuer: mainData.server_certificate?.issuer,
          validFrom: mainData.server_certificate?.valid_from,
          validTo: mainData.server_certificate?.valid_until,
          commonName: mainData.server_certificate?.subject,
          altNames: mainData.server_certificate?.alternative_names
        }
      });
    } catch (err) {
      setError('Failed to fetch TLS/SSL information');
      console.error('TLS test error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const testTLSVersion = async (version: string): Promise<boolean> => {
    try {
      const response = await fetchWithTimeout('https://www.howsmyssl.com/a/check', {
        method: 'GET',
        headers: {
          'Sec-Version': version
        }
      });
      return response.status === 200;
    } catch {
      return false;
    }
  };

  const getStatusIcon = () => {
    if (isLoading) return <Loader className="w-5 h-5 animate-spin text-gray-500" />;
    if (error) return <AlertTriangle className="w-5 h-5 text-red-500" />;
    if (results) return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <RefreshCw className="w-5 h-5 text-gray-400" />;
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-4 mb-4">
        {getStatusIcon()}
        <div className="flex-1">
          <h3 className="font-mono font-medium uppercase tracking-wide">
            TLS/SSL Fingerprint Test
          </h3>
          <p className="text-sm text-gray-600">
            {isLoading ? 'Analyzing TLS/SSL configuration...' :
             error ? error :
             results ? 'TLS/SSL fingerprint analysis complete' :
             'Click to analyze TLS/SSL configuration'}
          </p>
        </div>
      </div>

      {results && (
        <div className="ml-9 space-y-2 text-sm text-gray-600 font-mono">
          <div>TLS Version: {results.tlsVersion}</div>
          <div>Cipher Suite: {results.cipherSuite}</div>
          <div>Supported Protocols: {results.supportedProtocols?.join(', ') || 'Unknown'}</div>
          
          {results.supportedCiphers && results.supportedCiphers.length > 0 && (
            <div className="mt-2">
              <div>Supported Cipher Suites:</div>
              {results.supportedCiphers.slice(0, 5).map((cipher, idx) => (
                <div key={idx} className="ml-2 text-xs break-all">{cipher}</div>
              ))}
              {results.supportedCiphers.length > 5 && (
                <div className="ml-2 text-xs">...and {results.supportedCiphers.length - 5} more</div>
              )}
            </div>
          )}
          
          {Object.entries(results.securityHeaders).length > 0 && (
            <div className="mt-2">
              <div>Security Headers:</div>
              {Object.entries(results.securityHeaders).map(([key, value]) => (
                <div key={key} className="ml-2 text-xs break-all">
                  {key}: {value}
                </div>
              ))}
            </div>
          )}

          {results.certificateInfo && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div>Certificate Information:</div>
              <div className="ml-2">
                <div>Issuer: {results.certificateInfo.issuer || 'Unknown'}</div>
                <div>Valid From: {results.certificateInfo.validFrom || 'Unknown'}</div>
                <div>Valid To: {results.certificateInfo.validTo || 'Unknown'}</div>
                {results.certificateInfo.commonName && (
                  <div>Common Name: {results.certificateInfo.commonName}</div>
                )}
                {results.certificateInfo.altNames && results.certificateInfo.altNames.length > 0 && (
                  <div>Alt Names: {results.certificateInfo.altNames.join(', ')}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={checkTLSFingerprint}
        disabled={isLoading}
        className={cn(
          "mt-4 px-4 py-2 font-mono text-sm uppercase tracking-wider text-white bg-black",
          "rounded-md transition-colors duration-200",
          "hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
        )}
      >
        {isLoading ? 'Analyzing...' : 'Check TLS/SSL Fingerprint'}
      </button>
    </div>
  );
};

export default TLSFingerprintTest;