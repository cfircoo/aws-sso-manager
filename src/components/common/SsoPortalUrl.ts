export const getSsoPortalUrl = (accountId: string, roleName: string): string => {
  const ssoPortalId = process.env.REACT_APP_SSO_PORTAL_ID || 'd-90676c94d8';
  return `https://${ssoPortalId}.awsapps.com/start/#/console?account_id=${accountId}&role_name=${roleName}&referrer=accessPortal`;
}; 