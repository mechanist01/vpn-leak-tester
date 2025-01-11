import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

interface InfoIconProps {
  content: string | React.ReactNode;
}

// Define the structure for test information
export interface TestInfo {
  title: string;
  description: string;
}

// Define the structure for all test information
export interface TestInfoMap {
  webRTC: TestInfo;
  dns: TestInfo;
  ipAddress: TestInfo;
  tlsFingerprint: TestInfo;
  timezone: TestInfo;
  network: TestInfo;
  fingerprint: TestInfo;
  traffic: TestInfo;
}

// Export the test information to be used in VPNLeakTester
export const TEST_INFO: TestInfoMap = {
  webRTC: {
    title: "WebRTC Leak Test",
    description: "WebRTC (Web Real-Time Communication) can bypass your VPN tunnel and expose your real IP address. This test checks for potential IP leaks through WebRTC connections by examining local and public IP addresses discovered during peer connection setup. A failed test indicates your true location might be visible despite VPN usage."
  },
  dns: {
    title: "DNS Leak Test",
    description: "DNS (Domain Name System) leaks occur when DNS queries bypass your VPN tunnel. This test checks multiple DNS resolvers and compares their responses to detect inconsistencies. It verifies DNS requests are properly routed through your VPN by analyzing IPv4/IPv6 resolutions and reverse DNS records. Inconsistent results may indicate your browsing activity is visible to your ISP."
  },
  ipAddress: {
    title: "IP Address Test",
    description: "This comprehensive IP check verifies your VPN's effectiveness by querying multiple IP detection services. It confirms your apparent location matches your VPN server location, checks for IP address consistency across services, and analyzes geolocation data. Any inconsistencies could indicate partial VPN failure or traffic leakage."
  },
  tlsFingerprint: {
    title: "TLS Fingerprint Test",
    description: "Your browser's TLS (Transport Layer Security) configuration creates a unique fingerprint that can be used for tracking. This test analyzes your TLS handshake parameters, cipher suites, and supported protocols to determine how unique your encryption configuration is. A highly unique fingerprint makes your browser more identifiable across websites."
  },
  timezone: {
    title: "Timezone Analysis",
    description: "Checks for discrepancies between your system timezone and VPN location. Mismatches between your timezone settings and apparent IP location can reveal your true geographic location despite using a VPN."
  },
  network: {
    title: "Network Interface Analysis",
    description: "Examines network characteristics including MTU sizes, packet fragmentation, and connection properties. Unusual patterns can indicate VPN usage and potential configuration issues that might compromise privacy."
  },
  fingerprint: {
    title: "Browser Fingerprint Analysis",
    description: "Analyzes browser-specific identifiers including language settings, screen resolution, and WebGL details. Inconsistencies between these values and your VPN location can make your browser uniquely identifiable."
  },
  traffic: {
    title: "Traffic Pattern Analysis",
    description: "Measures network latency patterns and variations. Unusual latency patterns or high variability can indicate VPN usage and potential traffic analysis vulnerabilities that could be used to identify VPN users."
  }
};

const InfoIcon: React.FC<InfoIconProps> = ({ content }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState<'right' | 'left' | 'top'>('right');
    const iconRef = useRef<HTMLDivElement>(null);
  
    useEffect(() => {
      const updatePosition = () => {
        if (iconRef.current) {
          const rect = iconRef.current.getBoundingClientRect();
          const spaceRight = window.innerWidth - rect.right;
          const spaceLeft = rect.left;
  
          if (spaceRight < 300) {
            if (spaceLeft > 300) {
              setTooltipPosition('left');
            } else {
              setTooltipPosition('top');
            }
          } else {
            setTooltipPosition('right');
          }
        }
      };
  
      if (showTooltip) {
        updatePosition();
      }
  
      window.addEventListener('resize', updatePosition);
      return () => window.removeEventListener('resize', updatePosition);
    }, [showTooltip]);
  
    const getTooltipClasses = () => {
      const baseClasses = "absolute z-50 w-64 p-4 bg-neutral-800 text-white text-sm rounded-lg shadow-lg";
      switch (tooltipPosition) {
        case 'right':
          return `${baseClasses} mt-2 -right-2 transform translate-x-full`;
        case 'left':
          return `${baseClasses} mt-2 -left-2 transform -translate-x-full`;
        case 'top':
          return `${baseClasses} bottom-full mb-2 left-1/2 transform -translate-x-1/2`;
        default:
          return baseClasses;
      }
    };
  
    return (
      <div className="relative inline-block ml-2" ref={iconRef}>
        <Info 
          className="w-4 h-4 cursor-help text-gray-400 hover:text-gray-600 transition-colors"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={() => setShowTooltip(!showTooltip)}
        />
        {showTooltip && (
          <div className={getTooltipClasses()}>
            <div className="relative">
              {content}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  export default InfoIcon;