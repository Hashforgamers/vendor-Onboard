'use client';

import React, { useState } from 'react';
import Navbar from './_components/Navbar';
import Collaborators from './_components/Collaborators';
import Products from './_components/Products';
import VendorOnboardingForm from "./_components/VendorOnboard";

const HomePage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'vendorOnboarding' | 'collaborator' | 'products' | 'vendorOrder'>('vendorOnboarding');

  return (
    <>
      <Navbar currentPage={currentPage} onChangePage={setCurrentPage} />
      <main className="bg-slate-950 min-h-screen p-6">
        {currentPage === 'vendorOnboarding' && (
          <div className="text-white text-center py-20 text-2xl">
            <VendorOnboardingForm/>
          </div>
        )}
        {currentPage === 'collaborator' && <Collaborators />}
        {currentPage === 'products' && <Products />}
        {currentPage === 'vendorOrder' && (
          <div className="text-white text-center py-20 text-2xl">
            Vendor Order Page Coming Soon
          </div>
        )}
      </main>
    </>
  );
};

export default HomePage;
