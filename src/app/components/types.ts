export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'error';

export interface TestState {
    status: TestStatus;
    message: string;
    details?: string[];
    timestamp?: string;
}

export interface Tests {
    webRTC: TestState;
    dns: TestState;
    ipAddress: TestState;
}

export interface WebRTCResult {
    leaked: boolean;
    ips: string[];
    error?: boolean;
    localIps?: string[];
    publicIps?: string[];
}

export interface EnhancedWebRTCResult extends WebRTCResult {
    ipv6Ips?: string[];
}

export interface IPCheckResult {
    ip?: string;
    allIPs?: string[];
    consistent?: boolean;
    locations?: GeoLocation[];
    error?: boolean;
}

export interface GeoLocation {
    ip: string;
    country: string;
    city: string;
    lat: number;
    lon: number;
    isp: string;
}

export interface LocationMarker {
    lat: number;
    lon: number;
    label: string;
    color: string;
}

export interface IPServiceResult {
    service: string;
    ip: string;
}

export interface DNSResult {
    server: string;
    domain: string;
    ipv4: string[];
    ipv6: string[];
    reversePtr?: string;
}

export interface LeakAnalysis {
    inconsistentIPv4: boolean;
    inconsistentIPv6: boolean;
    mismatchedPtr: boolean;
}

export interface DNSServer {
    name: string;
    endpoint: string;
    dohSupport: boolean;
}

export interface IPService {
    name: string;
    url: string;
}
// Add this to types.ts
export interface DNSCheckResult {
    leaked: boolean;
    results: DNSResult[];
    message: string;
}
