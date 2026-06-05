import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import UploadedAdminApp from '../uploadedAdmin/app/App.jsx';
import { AppProviders as UploadedAdminProviders } from '../uploadedAdmin/app/providers.jsx';
import '../uploadedAdmin/styles/global.css';

function getInitialAdminPath() {
  if (window.location.hash.startsWith('#/admin')) {
    return window.location.hash.slice(1) || '/admin/overview';
  }

  const cleanPath = window.location.pathname.replace(/\/+$/, '');
  if (cleanPath === '/backoffice') return '/admin/overview';

  if (cleanPath.toLowerCase().startsWith('/backoffice/')) {
    return `/admin${cleanPath.slice('/backoffice'.length)}`;
  }

  return '/admin/overview';
}

export function UploadedAdminPortalScreen() {
  const adminPath = getInitialAdminPath();

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
