import React, { useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { cn } from '@/lib/utils';

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
   if (isLoading) return <Loader className="w-5 h-5 animate-spin text-gray-500" />;
   if (error) return <AlertTriangle className="w-5 h-5 text-red-500" />;
   if (results) return <CheckCircle className="w-5 h-5 text-green-500" />;
   return <RefreshCw className="w-5 h-5 text-gray-400" />;
 };

 const formatDate = (dateString: string) => {
   return new Date(dateString).toLocaleString();
 };

 return (
   <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
     <div className="flex items-center gap-4 mb-4">
       {getStatusIcon()}
       <div className="flex-1">
         <h3 className="font-mono font-medium uppercase tracking-wide">
           TLS/SSL Security Test
         </h3>
         <p className="text-sm text-gray-500 italic">
           Powered by <a href="https://github.com/mechanist01/VLT-BE" className="underline hover:text-gray-700" target="_blank" rel="noopener noreferrer">Python Flask Backend</a>
         </p>
         <p className="text-sm text-gray-600">
           {isLoading ? 'Analyzing TLS/SSL configuration...' :
            error ? error :
            results ? 'Analysis complete' :
            'Click the button to analyze your TLS/SSL connection'}
         </p>
       </div>
     </div>

     {results && (
       <div className="ml-9 space-y-4 text-sm text-gray-600 font-mono">
         <div className="space-y-2">
           <h4 className="font-semibold">TLS Information:</h4>
           <div>Version: {results.version}</div>
           <div>Cipher Suite: {results.cipher_suite.name}</div>
           <div>Protocol: {results.cipher_suite.protocol}</div>
           <div>Bits: {results.cipher_suite.bits}</div>
         </div>

         <div className="space-y-2 pt-2 border-t border-gray-200">
           <h4 className="font-semibold">Certificate Information:</h4>
           <div>Subject: {results.cert_info.subject}</div>
           <div>Issuer: {results.cert_info.issuer}</div>
           <div>Valid From: {formatDate(results.cert_info.not_valid_before)}</div>
           <div>Valid To: {formatDate(results.cert_info.not_valid_after)}</div>
           <div>Serial Number: {results.cert_info.serial_number}</div>
         </div>
       </div>
     )}

     <button
       onClick={checkTLSFingerprint}
       disabled={isLoading}
       className={cn(
         "mt-4 px-4 py-2 font-mono text-sm uppercase tracking-wider text-white bg-black",
         "rounded-md transition-colors duration-200",
         "hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed",
         "w-full"
       )}
     >
       {isLoading ? 'Analyzing TLS/SSL...' : results ? 'Test Again' : 'Start TLS/SSL Test'}
     </button>
   </div>
 );
};

export default TLSFingerprintTest;