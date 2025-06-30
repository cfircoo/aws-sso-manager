import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: ReactNode;
  id?: string;
}

const Portal = ({ children, id = 'portal-root' }: PortalProps) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Try to find existing portal container
    let portalContainer = document.getElementById(id);
    
    // If it doesn't exist, create it
    if (!portalContainer) {
      portalContainer = document.createElement('div');
      portalContainer.id = id;
      portalContainer.style.position = 'relative';
      portalContainer.style.zIndex = '9999';
      document.body.appendChild(portalContainer);
    }
    
    setContainer(portalContainer);
    
    // Add modal-open class to body when portal is created
    document.body.classList.add('modal-open');
    
    // Cleanup function
    return () => {
      // Remove modal-open class from body
      document.body.classList.remove('modal-open');
      
      // Only remove if it's empty and we created it
      if (portalContainer && portalContainer.children.length === 0 && portalContainer.id === id) {
        try {
          document.body.removeChild(portalContainer);
        } catch (e) {
          // Element might already be removed
        }
      }
    };
  }, [id]);

  if (!container) {
    return null;
  }

  return createPortal(children, container);
};

export default Portal; 