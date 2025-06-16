import { useContext } from 'react';
import { SsoContext } from '../../contexts/SsoContext';

/**
 * Extract SSO portal ID from SSO URL
 * @param ssoUrl - The SSO URL from settings (e.g., "https://d-9367b3af91.awsapps.com/start")
 * @returns The portal ID or null if not found
 */
const extractPortalIdFromUrl = (ssoUrl: string): string | null => {
  try {
    const match = ssoUrl.match(/https:\/\/([^.]+)\.awsapps\.com/);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error extracting portal ID from URL:', error);
    return null;
  }
};

/**
 * React hook to generate SSO portal URLs
 * @returns A function that generates SSO portal URLs for account/role combinations
 */
export const useSsoPortalUrl = () => {
  const ssoContext = useContext(SsoContext);

  return (accountId: string, roleName: string): string => {
    // Extract portal ID from the SSO URL in context
    const ssoUrl = ssoContext?.appSettings?.ssoUrl || '';
    const portalId = extractPortalIdFromUrl(ssoUrl);
    
    if (!portalId) {
      console.error('Unable to extract portal ID from SSO URL:', ssoUrl);
      // Fallback to environment variable if available
      const fallbackPortalId = process.env.REACT_APP_SSO_PORTAL_ID;
      if (fallbackPortalId) {
        console.warn('Using fallback portal ID from environment variable');
        return `https://${fallbackPortalId}.awsapps.com/start/#/console?account_id=${accountId}&role_name=${roleName}&referrer=accessPortal`;
      }
      // Return a placeholder URL if no portal ID available
      return `https://PORTAL_ID_NOT_FOUND.awsapps.com/start/#/console?account_id=${accountId}&role_name=${roleName}&referrer=accessPortal`;
    }

    const url = `https://${portalId}.awsapps.com/start/#/console?account_id=${accountId}&role_name=${roleName}&referrer=accessPortal`;
    
    console.log('Generated SSO Portal URL:', {
      portalId,
      accountId,
      roleName,
      url,
      timestamp: new Date().toISOString()
    });

    return url;
  };
}; 