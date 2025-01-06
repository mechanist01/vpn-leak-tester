# VPN Leak Tester

A comprehensive React-based VPN leak detection system that helps users identify potential security vulnerabilities in their VPN connections. This application performs various tests including WebRTC leaks, DNS leaks, IP address consistency checks, and advanced network analysis.

## Features

- WebRTC Leak Detection
- DNS Leak Testing
- IP Address Verification
- Geolocation Mapping
- Advanced Network Tests:
  - Timezone Analysis
  - Network Interface Detection
  - Browser Fingerprint Analysis 
  - Traffic Pattern Analysis
- Real-time Test Logging
- Interactive IP Location Map

## Prerequisites

- Node.js (v18.0.0 or higher)
- npm or yarn
- A modern web browser

## Installation

1. Clone the repository:
```bash
git clone <your-repository-url>
cd vpn-leak-tester
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the root directory and add any required environment variables:
```env
NEXT_PUBLIC_MAP_PROVIDER_KEY=your_map_provider_key_if_needed
```

## Development

To run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Building for Production

To create a production build:

```bash
npm run build
# or
yarn build
```

To start the production server:

```bash
npm run start
# or
yarn start
```

## Project Structure

```
vpn-leak-tester/
├── src/
│   ├── app/
│   │   └── page.tsx
│   ├── components/
│   │   ├── VPNLeakTester.tsx
│   │   ├── AdvancedNetworkTests.tsx
│   │   └── IPLocationMap.tsx
│   └── lib/
│       └── utils.ts
├── public/
├── tailwind.config.ts
├── next.config.js
└── package.json
```

## Dependencies

- Next.js 15.1.3
- React 19.0.0
- Tailwind CSS
- Lucide React (for icons)
- Leaflet (for mapping)
- shadcn/ui components
- TypeScript

## Configuration

### Tailwind CSS

The project uses a custom Tailwind configuration with specific border radius settings and extended colors. You can modify these in `tailwind.config.ts`.

### Testing Parameters

You can customize various testing parameters in the application:

- DNS Servers: Edit the `DNS_SERVERS` array in `VPNLeakTester.tsx`
- IP Services: Modify the `IP_SERVICES` array in `VPNLeakTester.tsx`
- Test Timeouts: Adjust timeout values in individual test functions

## Browser Support

The application supports modern browsers with WebRTC capabilities:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

#

## Security Considerations

- This tool is for educational and testing purposes only
- Be aware that running leak tests may expose your actual IP address
- Some features may be blocked by corporate firewalls or strict network policies
- Consider local privacy laws and regulations when using geolocation features

## Troubleshooting

### Common Issues

1. If tests are timing out:
   - Check your internet connection
   - Verify VPN connection is stable
   - Adjust timeout values in the code

2. If geolocation mapping fails:
   - Ensure IP geolocation services are accessible
   - Check browser permissions
   - Verify map provider API key if used

3. For WebRTC test issues:
   - Enable WebRTC in your browser
   - Check browser privacy settings
   - Verify STUN server accessibility

## Acknowledgments

- Thanks to ipapi.co for IP geolocation services
- Thanks to the Leaflet.js team for mapping functionality
- shadcn/ui for React components

## Contact

For support or queries, please open an issue in the GitHub repository.

MIT License

Copyright (c) 2024 VPN Leak Tester

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.