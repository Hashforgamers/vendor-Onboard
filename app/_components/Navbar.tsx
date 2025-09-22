'use client';

import React from 'react';

interface NavbarProps {
  currentPage: 'vendorOnboarding' | 'collaborator' | 'products' | 'vendorOrder';
  onChangePage: (page: 'vendorOnboarding' | 'collaborator' | 'products' | 'vendorOrder') => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentPage, onChangePage }) => {
  const baseBtnClass = 'px-3 py-2 rounded-md text-sm font-semibold transition-colors';
  const activeBtnClass = 'bg-blue-600 text-white';
  const inactiveBtnClass = 'text-slate-400 hover:text-white';

  return (
    <nav className="bg-slate-900 border-b border-slate-700 py-3 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex space-x-4 px-4">
        <button
          className={`${baseBtnClass} ${
            currentPage === 'vendorOnboarding' ? activeBtnClass : inactiveBtnClass
          }`}
          onClick={() => onChangePage('vendorOnboarding')}
          aria-current={currentPage === 'vendorOnboarding' ? 'page' : undefined}
        >
          Vendor Onboarding
        </button>
        <button
          className={`${baseBtnClass} ${
            currentPage === 'collaborator' ? activeBtnClass : inactiveBtnClass
          }`}
          onClick={() => onChangePage('collaborator')}
          aria-current={currentPage === 'collaborator' ? 'page' : undefined}
        >
          Collaborators
        </button>
        <button
          className={`${baseBtnClass} ${
            currentPage === 'products' ? activeBtnClass : inactiveBtnClass
          }`}
          onClick={() => onChangePage('products')}
          aria-current={currentPage === 'products' ? 'page' : undefined}
        >
          Products
        </button>
        <button
          className={`${baseBtnClass} ${
            currentPage === 'vendorOrder' ? activeBtnClass : inactiveBtnClass
          }`}
          onClick={() => onChangePage('vendorOrder')}
          aria-current={currentPage === 'vendorOrder' ? 'page' : undefined}
        >
          Vendor Orders
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
