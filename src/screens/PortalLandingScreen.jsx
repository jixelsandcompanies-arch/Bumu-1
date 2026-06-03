import React, { useState } from 'react';
import {
  ArrowRight,
  Building2,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Smartphone,
  UsersRound
} from 'lucide-react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/ui/Text.jsx';
import { colors } from '../theme/colors.js';
import bumuLogo from '../../BumuLogo.jpeg';

const portals = [
  {
    key: 'finance',
    title: 'Finance',
    label: 'Collections, reports, commissions',
    icon: CreditCard,
    tone: colors.primary,
    status: 'Ready'
  },
  {
    key: 'admin',
    title: 'Admin',
    label: 'Users, products, branches',
    icon: ShieldCheck,
    tone: colors.violet,
    status: 'Ready'
  },
  {
    key: 'agent',
    title: 'Agent',
    label: 'Sales, customers, follow-up',
    icon: UsersRound,
    tone: colors.success,
    status: 'Ready'
  },
  {
    key: 'customer',
    title: 'Customer',
    label: 'Payments, balance, account',
    icon: Smartphone,
    tone: colors.orange,
    status: 'Ready'
  }
];

const navItems = [
  ['Portals', 'portals'],
  ['About', 'about'],
  ['Services', 'services'],
  ['Location', 'location'],
  ['Contact', 'contact']
];

const serviceHighlights = [
  {
    title: 'PAYGO product management',
    text: 'Keep bikes, phones, customer accounts, balances, and product identifiers organized in one place.'
  },
  {
    title: 'Collections and reconciliation',
    text: 'Review confirmed payments, compare receipts, and keep unpaid accounts visible for the finance team.'
  },
  {
    title: 'Agent and customer follow-up',
    text: 'See missed payments, overdue accounts, and the follow-up work that needs attention.'
  }
];

const locationDetails = [
  ['Base', 'Nairobi, Kenya'],
  ['Coverage', 'Kenya PAYGO customers and field teams'],
  ['Operations', 'Finance, admin, agent, and customer portals'],
  ['Support', 'Backend-connected alerts and follow-up']
];

const operatingSteps = [
  ['Register', 'Add customers, agents, products, and account details.'],
  ['Collect', 'Record confirmed payments and update balances.'],
  ['Follow up', 'Review missed payments and overdue accounts.'],
  ['Report', 'Check collections, commissions, and exports.']
];

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function PortalLandingScreen() {
  const [page, setPage] = useState('home');

  function openPortalPage() {
    setPage('portals');
    requestAnimationFrame(() => document.getElementById('site-top')?.scrollIntoView({ block: 'start' }));
  }

  function openPortal(portal) {
    if (portal.key === 'finance') {
      window.history.pushState(null, '', '#/login');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return;
    }

    if (portal.key === 'customer') {
      window.history.pushState(null, '', '#/customer');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return;
    }

    if (portal.key === 'agent') {
      window.history.pushState(null, '', '#/agent');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return;
    }

    if (portal.key === 'admin') {
      window.history.pushState(null, '', '#/admin');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator>
      <View style={styles.nav} id="site-top">
        <View style={styles.navBrand}>
          <Image source={bumuLogo} style={styles.navLogo} />
          <View>
            <Text style={styles.navTitle}>Bumu Paygo</Text>
            <Text style={styles.navMeta}>Nairobi, Kenya</Text>
          </View>
        </View>
        <View style={styles.navLinks}>
          {navItems.map(([label, target]) => (
            <Pressable
              key={target}
              onPress={() => {
                if (target === 'portals') {
                  openPortalPage();
                  return;
                }

                setPage('home');
                requestAnimationFrame(() => scrollToSection(target));
              }}
              style={styles.navLink}
            >
              <Text style={styles.navLinkText}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {page === 'portals' ? (
        <PortalCardsPage onBack={() => setPage('home')} onOpenPortal={openPortal} />
      ) : (
        <>
      <View style={styles.hero}>
        <Image source={bumuLogo} style={styles.heroImage} resizeMode="cover" />
        <View style={styles.heroShade} />

        <View style={styles.heroInner}>
          <View style={styles.brandBlock}>
            <View style={styles.brandRow}>
              <Image source={bumuLogo} style={styles.logo} />
              <View>
                <Text style={styles.brandName}>Bumu Paygo</Text>
                <Text style={styles.brandMeta}>Distributed CRM portals</Text>
              </View>
            </View>
            <Text style={styles.title}>Bumu Paygo</Text>
            <Text style={styles.subtitle}>
              A simple entry point for finance, admin, agent, and customer work.
            </Text>
            <View style={styles.heroActions}>
              <Pressable
                onPress={openPortalPage}
                style={({ pressed }) => [styles.primaryHeroAction, pressed && styles.portalPressed]}
              >
                <Text style={styles.primaryHeroText}>Open portals</Text>
                <ArrowRight size={18} color="#ffffff" />
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section} id="about">
        <View style={styles.sectionIntro}>
          <Text style={styles.kicker}>About</Text>
          <Text style={styles.sectionTitle}>Built for daily PAYGO work</Text>
          <Text style={styles.sectionText}>
            Bumu Paygo helps teams manage customer records, product sales, collections, commissions, and follow-up from connected portals.
          </Text>
        </View>
        <View style={styles.aboutGrid}>
          <View style={styles.aboutMain}>
            <Building2 size={24} color={colors.primary} />
            <Text style={styles.aboutTitle}>One workspace for the teams involved</Text>
            <Text style={styles.aboutText}>
              Finance, admin, field agents, and customers can work from the same records as the system grows.
            </Text>
          </View>
          <View style={styles.metricStack}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>4</Text>
              <Text style={styles.metricLabel}>Connected portals</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>1</Text>
              <Text style={styles.metricLabel}>Central CRM database</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.section, styles.serviceSection]} id="services">
        <View style={styles.sectionIntro}>
          <Text style={styles.kicker}>Services</Text>
          <Text style={styles.sectionTitle}>What the site supports</Text>
          <Text style={styles.sectionText}>
            The portals are designed around practical work: onboarding accounts, recording collections, handling follow-up, and reviewing finance records.
          </Text>
        </View>
        <View style={styles.highlights}>
          {serviceHighlights.map((item) => (
            <View key={item.title} style={styles.highlightCard}>
              <Text style={styles.highlightTitle}>{item.title}</Text>
              <Text style={styles.highlightText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.processBand}>
        <View style={styles.section}>
          <View style={styles.sectionIntro}>
            <Text style={styles.kicker}>Workflow</Text>
            <Text style={styles.sectionTitle}>From sale to follow-up</Text>
          </View>
          <View style={styles.steps}>
            {operatingSteps.map(([title, text], index) => (
              <View key={title} style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepTitle}>{title}</Text>
                <Text style={styles.stepText}>{text}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={[styles.section, styles.locationSection]} id="location">
        <View style={styles.locationCopy}>
          <View style={styles.locationBadge}>
            <MapPin size={18} color={colors.primary} />
            <Text style={styles.locationBadgeText}>Nairobi operations</Text>
          </View>
          <Text style={styles.sectionTitle}>Based in Nairobi</Text>
          <Text style={styles.sectionText}>
            The system is prepared for Nairobi-based operations with agents, customers, finance users, and administrators working from shared records.
          </Text>
        </View>
        <View style={styles.locationGrid}>
          {locationDetails.map(([label, value]) => (
            <View key={label} style={styles.locationItem}>
              <Text style={styles.locationLabel}>{label}</Text>
              <Text style={styles.locationValue}>{value}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerInner}>
          <View style={styles.footerBrand}>
            <Image source={bumuLogo} style={styles.footerLogo} />
            <View>
              <Text style={styles.footerTitle}>Bumu Paygo</Text>
              <Text style={styles.footerText}>Bumu Paygo portals.</Text>
            </View>
          </View>
          <View style={styles.footerLinks}>
            <View style={styles.footerItem}>
              <MapPin size={16} color={colors.primary} />
              <Text style={styles.footerText}>Nairobi, Kenya</Text>
            </View>
            <View style={styles.footerItem}>
              <Phone size={16} color={colors.success} />
              <Text style={styles.footerText}>Support via connected backend</Text>
            </View>
            <View style={styles.footerItem}>
              <Mail size={16} color={colors.orange} />
              <Text style={styles.footerText}>Portal access managed by admin</Text>
            </View>
          </View>
        </View>
      </View>
        </>
      )}
    </ScrollView>
  );
}

function PortalCardsPage({ onBack, onOpenPortal }) {
  return (
    <View style={styles.portalPage}>
      <View style={styles.portalPageHeader}>
        <View style={styles.sectionIntro}>
          <Text style={styles.kicker}>Portals</Text>
          <Text style={styles.portalPageTitle}>Choose a workspace</Text>
          <Text style={styles.sectionText}>
            Finance, Admin, Agent, and Customer portals use the same shared CRM database.
          </Text>
        </View>
        <Pressable onPress={onBack} style={styles.backHomeButton}>
          <Text style={styles.backHomeText}>Back to site</Text>
        </Pressable>
      </View>

      <View style={styles.marketGrid}>
        {portals.map((portal) => (
          <PortalCard key={portal.key} portal={portal} onPress={() => onOpenPortal(portal)} />
        ))}
      </View>
    </View>
  );
}

function PortalCard({ portal, onPress }) {
  const Icon = portal.icon;
  const canOpen = ['finance', 'admin', 'customer', 'agent'].includes(portal.key);

  return (
    <Pressable
      onPress={canOpen ? onPress : undefined}
      style={({ pressed }) => [
        styles.portalCard,
        pressed && canOpen && styles.portalPressed,
        !canOpen && styles.portalDisabled
      ]}
    >
      <View style={[styles.cardBanner, { backgroundColor: `${portal.tone}12` }]}>
        <View style={[styles.cardBadge, { backgroundColor: portal.tone }]}>
          <Text style={styles.cardBadgeText}>{portal.status}</Text>
        </View>
      </View>
      <View style={styles.portalCardTop}>
        <View style={[styles.portalIcon, { backgroundColor: `${portal.tone}14` }]}>
          <Icon size={24} color={portal.tone} />
        </View>
        <View style={styles.portalRight}>
          <Text style={[styles.portalStatus, { color: portal.tone }]}>{portal.status}</Text>
          <ArrowRight size={18} color={canOpen ? portal.tone : colors.muted} />
        </View>
      </View>
      <View style={styles.portalText}>
        <Text style={styles.portalTitle}>{portal.title}</Text>
        <Text style={styles.portalLabel}>{portal.label}</Text>
      </View>
      <View style={styles.portalCardFooter}>
        <Text style={[styles.openText, { color: portal.tone }]}>
          {canOpen ? 'Open portal' : 'Awaiting link'}
        </Text>
        <ArrowRight size={17} color={canOpen ? portal.tone : colors.muted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    height: 'var(--app-vh)',
    width: '100%',
    backgroundColor: '#f4f8fb',
    overflowY: 'auto'
  },
  content: {
    minHeight: 'var(--app-vh)',
    paddingBottom: 0
  },
  nav: {
    minHeight: 66,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dbe5ef',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  navBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  navLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary
  },
  navTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600'
  },
  navMeta: {
    color: colors.muted,
    fontSize: 12
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap'
  },
  navLink: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 8,
    cursor: 'pointer'
  },
  navLinkText: {
    color: colors.slate,
    fontSize: 14,
    fontWeight: '500'
  },
  hero: {
    minHeight: 520,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#dbe5ef'
  },
  heroImage: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '58%',
    height: '100%',
    opacity: 0.12
  },
  heroShade: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(244, 248, 251, 0.90)'
  },
  heroInner: {
    width: '100%',
    maxWidth: 1180,
    marginHorizontal: 'auto',
    paddingHorizontal: 28,
    paddingTop: 54,
    paddingBottom: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28
  },
  brandBlock: {
    flex: 1.1,
    minWidth: 280,
    maxWidth: 760,
    gap: 18
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary
  },
  brandName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text
  },
  brandMeta: {
    color: colors.muted,
    marginTop: 2
  },
  title: {
    fontSize: 44,
    lineHeight: 52,
    fontWeight: '600',
    color: colors.text
  },
  subtitle: {
    maxWidth: 560,
    fontSize: 19,
    lineHeight: 29,
    color: colors.slate
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap'
  },
  primaryHeroAction: {
    minHeight: 46,
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer'
  },
  primaryHeroText: {
    color: '#ffffff',
    fontWeight: '600'
  },
  portalPage: {
    width: '100%',
    maxWidth: 1180,
    marginHorizontal: 'auto',
    paddingHorizontal: 28,
    paddingTop: 38,
    paddingBottom: 56
  },
  portalPageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 18,
    flexWrap: 'wrap',
    marginBottom: 18
  },
  portalPageTitle: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '600',
    color: colors.text
  },
  backHomeButton: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: '#cfe0fb',
    borderRadius: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    cursor: 'pointer'
  },
  backHomeText: {
    color: colors.primary,
    fontWeight: '600'
  },
  marketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14
  },
  portalCard: {
    flexGrow: 1,
    flexBasis: 250,
    minHeight: 235,
    borderWidth: 1,
    borderColor: '#dbe5ef',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    justifyContent: 'space-between',
    cursor: 'pointer'
  },
  cardBanner: {
    height: 68,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e7edf5'
  },
  cardBadge: {
    minHeight: 24,
    borderRadius: 8,
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600'
  },
  portalCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 14
  },
  portalPressed: {
    transform: [{ scale: 0.99 }],
    backgroundColor: '#f8fbff'
  },
  portalDisabled: {
    cursor: 'default',
    opacity: 0.76
  },
  portalIcon: {
    width: 46,
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  portalText: {
    minWidth: 0,
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  portalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text
  },
  portalLabel: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19
  },
  portalCardFooter: {
    minHeight: 48,
    borderTopWidth: 1,
    borderTopColor: '#e7edf5',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10
  },
  openText: {
    fontSize: 13,
    fontWeight: '600'
  },
  portalRight: {
    alignItems: 'flex-end',
    gap: 6
  },
  portalStatus: {
    fontSize: 12,
    fontWeight: '600'
  },
  section: {
    width: '100%',
    maxWidth: 1180,
    marginHorizontal: 'auto',
    paddingHorizontal: 28,
    paddingVertical: 40
  },
  sectionIntro: {
    maxWidth: 780,
    gap: 10,
    marginBottom: 24
  },
  kicker: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  sectionTitle: {
    fontSize: 29,
    lineHeight: 36,
    fontWeight: '600',
    color: colors.text
  },
  sectionText: {
    fontSize: 16,
    lineHeight: 25,
    color: colors.slate
  },
  aboutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  aboutMain: {
    flex: 1.35,
    minWidth: 280,
    borderWidth: 1,
    borderColor: '#dbe5ef',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 20,
    gap: 10
  },
  aboutTitle: {
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '600',
    color: colors.text
  },
  aboutText: {
    color: colors.muted,
    lineHeight: 23
  },
  metricStack: {
    flex: 0.65,
    minWidth: 220,
    gap: 12
  },
  metricItem: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#dbe5ef',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 18,
    justifyContent: 'center'
  },
  metricValue: {
    fontSize: 30,
    fontWeight: '600',
    color: colors.primary
  },
  metricLabel: {
    color: colors.slate,
    fontWeight: '500'
  },
  serviceSection: {
    paddingTop: 30
  },
  highlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14
  },
  highlightCard: {
    flex: 1,
    minWidth: 250,
    borderWidth: 1,
    borderColor: '#dbe5ef',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 18,
    gap: 8
  },
  highlightTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text
  },
  highlightText: {
    color: colors.muted,
    lineHeight: 22
  },
  processBand: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#dbe5ef',
    borderBottomWidth: 1,
    borderBottomColor: '#dbe5ef'
  },
  steps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  step: {
    flex: 1,
    minWidth: 210,
    borderWidth: 1,
    borderColor: '#dbe5ef',
    borderRadius: 8,
    backgroundColor: '#f8fbff',
    padding: 16,
    gap: 8
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepNumberText: {
    color: '#ffffff',
    fontWeight: '600'
  },
  stepTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600'
  },
  stepText: {
    color: colors.muted,
    lineHeight: 21
  },
  locationSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#dbe5ef',
    borderBottomWidth: 1,
    borderBottomColor: '#dbe5ef'
  },
  locationCopy: {
    flex: 1.1,
    minWidth: 280,
    gap: 12
  },
  locationBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 36,
    borderWidth: 1,
    borderColor: '#cfe0fb',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.primarySoft
  },
  locationBadgeText: {
    color: colors.primary,
    fontWeight: '600'
  },
  locationGrid: {
    flex: 0.9,
    minWidth: 280,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  locationItem: {
    flexGrow: 1,
    flexBasis: 180,
    minHeight: 92,
    borderWidth: 1,
    borderColor: '#dbe5ef',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 14,
    justifyContent: 'center'
  },
  locationLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  locationValue: {
    marginTop: 6,
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#dbe5ef',
    backgroundColor: '#0f172a',
    paddingHorizontal: 28,
    paddingVertical: 24
  },
  footerInner: {
    width: '100%',
    maxWidth: 1180,
    marginHorizontal: 'auto',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 18,
    flexWrap: 'wrap'
  },
  footerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 240
  },
  footerLogo: {
    width: 44,
    height: 44,
    borderRadius: 8
  },
  footerTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600'
  },
  footerText: {
    color: '#cbd5e1',
    lineHeight: 20
  },
  footerLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 14
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7
  }
});
