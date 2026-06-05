import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import BackOfficeApp from '../backOffice/app/App.jsx';
import { AppProviders as UploadedAdminProviders } from '../uploadedAdmin/app/providers.jsx';
import '../uploadedAdmin/styles/global.css';

export function BackOfficePortalScreen() {
  return (
    <div className="uploaded-admin-viewport">
      <BrowserRouter>
        <UploadedAdminProviders>
          <BackOfficeApp />
        </UploadedAdminProviders>
      </BrowserRouter>
    </div>
  );
}
