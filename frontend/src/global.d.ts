declare module '*.jsx' {
  const content: any;
  export default content;
}

declare module './components/ui/button' {
  export const Button: any;
}

declare module './components/ui/avatar' {
  export const Avatar: any;
  export const AvatarImage: any;
  export const AvatarFallback: any;
}

declare module './components/ui/badge' {
  export const Badge: any;
}

declare module './components/ui/tabs' {
  export const Tabs: any;
  export const TabsList: any;
  export const TabsTrigger: any;
  export const TabsContent: any;
}

declare module './components/ui/dialog' {
  export const Dialog: any;
  export const DialogContent: any;
  export const DialogTitle: any;
  export const DialogDescription: any;
  export const VisuallyHidden: any;
}

declare module './components/ui/toast' {
  export const useToast: any;
  export const ToastProvider: any;
}

declare module './components/MembershipDashboard' {
  const MembershipDashboard: any;
  export default MembershipDashboard;
}

declare module './components/MembershipPlans' {
  const MembershipPlans: any;
  export default MembershipPlans;
}


declare module './components/LoginModal' {
  const LoginModal: any;
  export default LoginModal;
}

declare module './components/UserProfile' {
  const UserProfile: any;
  export default UserProfile;
}

// REMOVED: ChatRoomList module - Chat functionality removed

// REMOVED: RealTimeChat module - Chat functionality removed

// REMOVED: CreatePrivateRoomModal module - Chat functionality removed

declare module './components/AIMatchingSystem' {
  const AIMatchingSystem: any;
  export default AIMatchingSystem;
}

// REMOVED: PrivateChatList, PrivateChat, NewPrivateChatModal modules - Chat functionality removed

declare module './components/AdminDashboard' {
  const AdminDashboard: any;
  export default AdminDashboard;
}

declare module './components/HealthCheck' {
  const HealthCheck: any;
  export default HealthCheck;
}

declare module './components/JoinChatRoom' {
  const JoinChatRoom: any;
  export default JoinChatRoom;
}

declare module './contexts/AuthContext' {
  export const useAuth: any;
  export const AuthProvider: any;
}

declare module './services/membershipAPI' {
  export const membershipAPI: any;
}

declare module './services/autoRefreshManager' {
  const autoRefreshManager: any;
  export default autoRefreshManager;
}

// Extend Window interface to include socketManager and custom properties
declare global {
  interface Window {
    socketManager?: {
      socket: any;
      connect: () => void;
      disconnect: () => void;
      emit: (event: string, data?: any) => void;
    } | null;
    isSocketReady?: () => boolean;
    debugSocket?: () => void;
    lastBlurClickTime?: number;
    updateAuthContext?: (user: any) => void;
    authContextUser?: any;
    currentUserId?: string;
  }
  
  // NodeJS types for setTimeout
  namespace NodeJS {
    interface Timeout {
      ref(): this;
      unref(): this;
      hasRef(): boolean;
    }
  }
}

export {};