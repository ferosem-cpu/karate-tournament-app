import AppSidebar from '@/components/app-sidebar';
import Protected from '@/components/protected';

export default function DashboardLayout({ children }) {
  return (
    <Protected>
      <div className="min-h-screen flex bg-background">
        <AppSidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <div className="px-6 py-6 md:px-8 md:py-8 max-w-[1500px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </Protected>
  );
}
