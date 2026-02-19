'use client';

import React from 'react';

type Page = 'vendorOnboarding' | 'collaborator' | 'products' | 'vendorOrder' | 'vendorDeboard';

interface NavbarProps {
  currentPage: Page;
  onChangePage: (page: Page) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentPage, onChangePage }) => {
  const baseBtnClass = 'px-3 py-2 rounded-md text-sm font-semibold transition-colors';
  const activeBtnClass = 'bg-blue-600 text-white';
  const inactiveBtnClass = 'text-slate-400 hover:text-white';
  const activeDeboardClass = 'bg-red-600 text-white';
  const inactiveDeboardClass = 'text-red-400 hover:text-red-300';

  const navItems: { label: string; page: Page; isDanger?: boolean }[] = [
    { label: 'Vendor Onboarding', page: 'vendorOnboarding' },
    { label: 'Collaborators',     page: 'collaborator' },
    { label: 'Products',          page: 'products' },
    { label: 'Vendor Orders',     page: 'vendorOrder' },
    { label: 'Vendor Deboard',    page: 'vendorDeboard', isDanger: true },
  ];

  return (
    <nav className="bg-slate-900 border-b border-slate-700 py-3 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex items-center space-x-2 px-4">
        {navItems.map(({ label, page, isDanger }) => (
          <button
            key={page}
            className={`${baseBtnClass} ${
              currentPage === page
                ? isDanger ? activeDeboardClass : activeBtnClass
                : isDanger ? inactiveDeboardClass : inactiveBtnClass
            }`}
            onClick={() => onChangePage(page)}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;
