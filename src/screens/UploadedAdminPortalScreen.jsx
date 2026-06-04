import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import UploadedAdminApp from '../uploadedAdmin/app/App.jsx';
import { AppProviders as UploadedAdminProviders } from '../uploadedAdmin/app/providers.jsx';
import '../uploadedAdmin/styles/global.css';

export function UploadedAdminPortalScreen() {
  const adminPath = window.location.hash.startsWith('#/admin')
    ? window.location.hash.slice(1)
    : '/admin/overview';

  return (
    <div className="uploaded-admin-viewport">
      <MemoryRouter initialEntries={[adminPath || '/admin/overview']}>
        <UploadedAdminProviders>
          <UploadedAdminApp />
        </UploadedAdminProviders>
      </MemoryRouter>
    </div>
  );
}
