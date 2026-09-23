export type BizOverlay =
  | 'advertising'
  | 'campaignSuccess'
  | 'notifications'
  | 'billing'
  | 'editProfile'
  | 'help'
  | 'onboarding';

export type BizNavHandlers = {
  openAdvertising: () => void;
  openNotifications: () => void;
  openBilling: () => void;
  openEditProfile: () => void;
  openHelp: () => void;
  openCampaignSuccess: () => void;
  goPlaces: () => void;
  goEvents: () => void;
  closeOverlay: () => void;
};
