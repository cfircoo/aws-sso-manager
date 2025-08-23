import React from 'react';
import { Mail, Copyright } from 'lucide-react';
import BuyMeCoffeeButton from './BuyMeCoffeeButton';

const Footer: React.FC = () => {
  return (
    <footer className="relative mt-auto py-6 px-4">
      {/* Subtle top border with gradient */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
      
      <div className="flex flex-col items-center justify-center space-y-3 text-center">
        {/* Support Button */}
        <div className="mb-2">
          <BuyMeCoffeeButton size="small" variant="minimal" />
        </div>
        
        {/* Copyright and Author Information */}
        <div className="flex items-center space-x-2 text-sm text-tertiary/80">
          <Copyright className="w-4 h-4" />
          <span>All copyrights reserved to <span className="text-primary font-medium">Cfir Carmeli</span></span>
        </div>
        
        {/* Author and Contact */}
        <div className="flex items-center space-x-3 text-xs text-tertiary/60">
          <span>Author: <span className="text-secondary font-medium">Carmeli Cfir</span></span>
          <span className="text-tertiary/40">•</span>
          <a 
            href="mailto:cfir@carmeli.me" 
            className="flex items-center space-x-1 hover:text-primary transition-colors duration-200 hover:scale-105 transform"
          >
            <Mail className="w-3 h-3" />
            <span>cfir@carmeli.me</span>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 