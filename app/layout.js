import './globals.css';
export const metadata = {
  title: 'PipelineMedic — CI/CD Control Plane',
  description: 'Manage pipeline configurations across CI providers, then investigate failures from one workspace.',
};
export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
