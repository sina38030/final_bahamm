"use client";

import { buildAuthURL } from '@/utils/crossDomainAuth';
import Link from 'next/link';
import { useCallback } from 'react';

/**
 * CrossDomainLink Component
 * 
 * A Link component that automatically includes authentication tokens
 * when navigating between different domains (bahamm.ir <-> app.bahamm.ir)
 */

interface CrossDomainLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  target?: string;
  rel?: string;
}

export function CrossDomainLink({ 
  href, 
  children, 
  className, 
  onClick,
  target,
  rel
}: CrossDomainLinkProps) {
  
  const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    // Call custom onClick if provided
    if (onClick) {
      onClick(e);
    }

    // If the link is to a different domain, add auth parameters
    if (typeof window !== 'undefined') {
      try {
        const linkUrl = new URL(href, window.location.origin);
        const currentHost = window.location.hostname;
        
        // Check if it's a cross-domain link
        if (linkUrl.hostname !== currentHost) {
          // Prevent default navigation
          e.preventDefault();
          
          // Navigate with auth token
          const authUrl = buildAuthURL(href);
          if (target === '_blank') {
            window.open(authUrl, '_blank', rel);
          } else {
            window.location.href = authUrl;
          }
        }
      } catch (error) {
        console.error('[CrossDomainLink] Error handling click:', error);
      }
    }
  }, [href, onClick, target, rel]);

  return (
    <Link 
      href={href} 
      className={className}
      onClick={handleClick}
      target={target}
      rel={rel}
    >
      {children}
    </Link>
  );
}

/**
 * useCrossDomainNavigation Hook
 * 
 * Returns a function to navigate to another domain with authentication
 */
export function useCrossDomainNavigation() {
  return useCallback((href: string, openInNewTab: boolean = false) => {
    if (typeof window === 'undefined') return;

    const authUrl = buildAuthURL(href);
    
    if (openInNewTab) {
      window.open(authUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = authUrl;
    }
  }, []);
}

