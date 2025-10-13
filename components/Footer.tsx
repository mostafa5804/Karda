import React from 'react';

const ICONS = {
    twitter: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
        </svg>
    ),
    telegram: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="m9.417 15.181-.397 5.584c.568 0 .814-.244 1.109-.537l2.663-2.545 5.518 4.041c1.012.564 1.725.267 1.998-.931L23.43 3.123c.272-1.215-.484-1.722-1.282-1.434L1.337 9.431c-1.215.487-1.201 1.161-.227 1.464l4.561 1.42L17.64 6.713c.787-.498 1.505-.228.914.334z"></path>
        </svg>
    ),
};


const Footer: React.FC = () => {
    return (
        <footer className="p-4 bg-base-200 text-base-content border-t border-base-300">
            <div className="flex justify-center items-center gap-4">
                <span>ساخته شده توسط مصطفی</span>
                <a href="https://twitter.com/mostafa5804" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors" title="Twitter">
                    {ICONS.twitter}
                </a>
                <a href="https://t.me/mostafa5804" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors" title="Telegram">
                    {ICONS.telegram}
                </a>
            </div>
        </footer>
    );
};

export default Footer;
