import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import BackOfficeApp from '../backOffice/app/App.jsx';
import { AppProviders as UploadedAdminProviders } from '../uploadedAdmin/app/providers.jsx';
import '../uploadedAdmin/styles/global.css';

function getInitialBackOfficePath() {
  const cleanPath = window.location.pathname.replace(/\/+$/, '');
  if (cleanPath === '/backoffice') return '/backoffice/overview';
  if (cleanPath.toLowerCase().startsWith('/backoffice/')) return cleanPath;
  return '/backoffice/overview';
}

export function BackOfficePortalScreen() {
  const backOfficePath = getInitialBackOfficePath();

  return (
    <div className="uploaded-admin-viewport">
      <MemoryRouter initialEntries={[backOfficePath]}>
        <UploadedAdminProviders>
          <BackOfficeApp />
        </UploadedAdminProviders>
      </MemoryRouter>
    </div>
  );
}
