import React from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Bike,
  Building2,
  BriefcaseBusiness,
  CreditCard,
  Headphones,
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

const portalLinks = {
  admin: import.meta.env.VITE_ADMIN_PORTAL_URL || '',
  agent: import.meta.env.VITE_AGENT_PORTAL_URL || '',
  customer: import.meta.env.VITE_CUSTOMER_PORTAL_URL || ''
};

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
    status: portalLinks.admin ? 'Open' : 'Connect'
  },
  {
    key: 'agent',
    title: 'Agent',
    label: 'Sales, customers, follow-up',
    icon: UsersRound,
    tone: colors.success,
    status: portalLinks.agent ? 'Open' : 'Connect'
  },
  {
    key: 'customer',
    title: 'Customer',
    label: 'Payments, balance, account',
    icon: Smartphone,
    tone: colors.orange,
    status: portalLinks.customer ? 'Open' : 'Connect'
  }
];

const systemPoints = [
  { label: 'Shared Supabase CRM', icon: BadgeCheck },
  { label: 'Stateless Vercel routes', icon: BriefcaseBusiness },
  { label: 'PAYGO products', icon: Bike }
];

const navItems = [
  ['About', 'about'],
  ['Services', 'services'],
  ['Location', 'location'],
  ['Contact', 'contact']
];

const serviceHighlights = [
  {
    title: 'PAYGO product management',
    text: 'Track bikes, phones, customer accounts, balances, activation status, and product identifiers from one shared CRM.'
  },
  {
    title: 'Collections and reconciliation',
    text: 'Record backend-confirmed payments, compare provider receipts, and keep finance teams aligned on unpaid accounts.'
  },
  {
    title: 'Agent and customer follow-up',
    text: 'Surface alerts for missed payments, overdue accounts, agent activity, and customer communication workflows.'
  }
];

const locationDetails = [
  ['Base', 'Nairobi, Kenya'],
  ['Coverage', 'Kenya PAYGO customers and field teams'],
  ['Operations', 'Finance, admin, agent, and customer portals'],
  ['Support', 'Backend-connected alerts and follow-up']
];

const operatingSteps = [
  ['Register', 'Customers, agents, products, and accounts are captured into the shared CRM.'],
  ['Collect', 'Backend-confirmed payments update balances, reconciliation, and collection status.'],
  ['Follow up', 'Teams see alerts for missed payments, overdue accounts, and customer action.'],
  ['Report', 'Finance reviews collections, commissions, exports, and operational performance.']
];

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function PortalLandingScreen() {
  function openPortal(portal) {
    if (portal.key === 'finance') {
      window.history.pushState(null, '', '#/login');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return;
    }

    const url = portalLinks[portal.key];
    if (url) {
      window.location.href = url;
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator>
      <View style={styles.nav}>
        <View style={styles.navBrand}>
          <Image source={bumuLogo} style={styles.navLogo} />
          <View>
            <Text style={styles.navTitle}>Bumu Paygo</Text>
            <Text style={styles.navMeta}>Nairobi, Kenya</Text>
          </View>
        </View>
        <View style={styles.navLinks}>
          {navItems.map(([label, target]) => (
            <Pressable key={target} onPress={() => scrollToSection(target)} style={styles.navLink}>
              <Text style={styles.navLinkText}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={() => {
            window.history.pushState(null, '', '#/login');
            window.dispatchEvent(new HashChangeEvent('hashchange'));
          }}
          style={({ pressed }) => [styles.navAction, pressed && styles.portalPressed]}
        >
          <Text style={styles.navActionText}>Finance login</Text>
        </Pressable>
      </View>

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
              One entry point for finance, admin, agent, and customer operations across PAYGO products.
            </Text>
            <View style={styles.heroActions}>
              <Pressable
                onPress={() => {
                  window.history.pushState(null, '', '#/login');
                  window.dispatchEvent(new HashChangeEvent('hashchange'));
                }}
                style={({ pressed }) => [styles.primaryHeroAction, pressed && styles.portalPressed]}
              >
                <Text style={styles.primaryHeroText}>Open finance portal</Text>
                <ArrowRight size={18} color="#ffffff" />
              </Pressable>
              <Pressable onPress={() => scrollToSection('about')} style={styles.secondaryHeroAction}>
                <Text style={styles.secondaryHeroText}>About Bumu Paygo</Text>
              </Pressable>
            </View>
            <View style={styles.pointRow}>
              {systemPoints.map((point) => {
                const Icon = point.icon;
                return (
                  <View key={point.label} style={styles.point}>
                    <Icon size={16} color={colors.success} />
                    <Text style={styles.pointText}>{point.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.portalPanel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Portals</Text>
              <Text style={styles.panelMeta}>Select workspace</Text>
            </View>
            <View style={styles.portalList}>
              {portals.map((portal) => (
                <PortalButton key={portal.key} portal={portal} onPress={() => openPortal(portal)} />
              ))}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.nextBand}>
        <Text style={styles.nextTitle}>Centralized system</Text>
        <Text style={styles.nextText}>
          Payments, customers, commissions, alerts, and reconciliation stay connected through the shared database and backend APIs.
        </Text>
      </View>

      <View style={styles.section} id="about">
        <View style={styles.sectionIntro}>
          <Text style={styles.kicker}>About</Text>
          <Text style={styles.sectionTitle}>Built for distributed PAYGO operations</Text>
          <Text style={styles.sectionText}>
            Bumu Paygo brings customer records, product sales, collections, commissions, and operational alerts into connected portals for the teams that need them.
          </Text>
        </View>
        <View style={styles.aboutGrid}>
          <View style={styles.aboutMain}>
            <Building2 size={24} color={colors.primary} />
            <Text style={styles.aboutTitle}>A centralized operating system for PAYGO teams</Text>
            <Text style={styles.aboutText}>
              The platform is structured for a growing organization where finance, administration, field agents, and customers need consistent records from the same database.
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
          <Text style={styles.sectionTitle}>Operations covered by the system</Text>
          <Text style={styles.sectionText}>
            The portals are designed around daily work: onboarding accounts, recording collections, managing field follow-up, and reviewing finance records.
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
            <Text style={styles.sectionTitle}>From sale to collection follow-up</Text>
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
          <Text style={styles.sectionTitle}>Based in Nairobi, serving field teams and customers</Text>
          <Text style={styles.sectionText}>
            The system is structured for a central Nairobi operation with distributed agents, customers, finance users, and administrators working from the same source of truth.
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

      <View style={styles.section} id="contact">
        <View style={styles.contactBar}>
          <View style={styles.contactIcon}>
            <Headphones size={24} color={colors.success} />
          </View>
          <View style={styles.contactText}>
            <Text style={styles.contactTitle}>Portal access and support</Text>
            <Text style={styles.contactBody}>
              Finance can sign in now. Admin, agent, and customer portals can be connected through public portal URLs when they are deployed.
            </Text>
          </View>
          <Pressable
            onPress={() => {
              window.history.pushState(null, '', '#/login');
              window.dispatchEvent(new HashChangeEvent('hashchange'));
            }}
            style={({ pressed }) => [styles.contactAction, pressed && styles.portalPressed]}
          >
            <Text style={styles.contactActionText}>Open finance</Text>
            <ArrowRight size={17} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerInner}>
          <View style={styles.footerBrand}>
            <Image source={bumuLogo} style={styles.footerLogo} />
            <View>
              <Text style={styles.footerTitle}>Bumu Paygo</Text>
              <Text style={styles.footerText}>PAYGO portals for Nairobi operations.</Text>
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
    </ScrollView>
  );
}

function PortalButton({ portal, onPress }) {
  const Icon = portal.icon;
  const disabled = portal.key !== 'finance' && !portalLinks[portal.key];

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.portalButton,
        pressed && !disabled && styles.portalPressed,
        disabled && styles.portalDisabled
      ]}
    >
      <View style={[styles.portalIcon, { backgroundColor: `${portal.tone}14` }]}>
        <Icon size={22} color={portal.tone} />
      </View>
      <View style={styles.portalText}>
        <Text style={styles.portalTitle}>{portal.title}</Text>
        <Text style={styles.portalLabel}>{portal.label}</Text>
      </View>
      <View style={styles.portalRight}>
        <Text style={[styles.portalStatus, { color: portal.tone }]}>{portal.status}</Text>
        <ArrowRight size={17} color={disabled ? colors.muted : portal.tone} />
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
    minHeight: 72,
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
    fontWeight: '800'
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
    fontWeight: '700'
  },
  navAction: {
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    cursor: 'pointer'
  },
  navActionText: {
    color: '#ffffff',
    fontWeight: '800'
  },
  hero: {
    minHeight: 'calc(var(--app-vh) - 92px)',
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
    opacity: 0.18
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
    paddingTop: 34,
    paddingBottom: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28
  },
  brandBlock: {
    flex: 1.1,
    minWidth: 280,
    gap: 20
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
    fontSize: 20,
    fontWeight: '700',
    color: colors.text
  },
  brandMeta: {
    color: colors.muted,
    marginTop: 2
  },
  title: {
    fontSize: 54,
    lineHeight: 60,
    fontWeight: '800',
    color: colors.text
  },
  subtitle: {
    maxWidth: 560,
    fontSize: 20,
    lineHeight: 30,
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
    fontWeight: '800'
  },
  secondaryHeroAction: {
    minHeight: 46,
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#cfe0fb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },
  secondaryHeroText: {
    color: colors.primary,
    fontWeight: '800'
  },
  pointRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  point: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#cfe6da',
    borderRadius: 8,
    backgroundColor: '#ffffff'
  },
  pointText: {
    fontSize: 13,
    color: colors.slate,
    fontWeight: '600'
  },
  portalPanel: {
    flex: 0.9,
    minWidth: 320,
    maxWidth: 460,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe5ef',
    borderRadius: 8,
    padding: 16,
    gap: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.10,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 }
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12
  },
  panelTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text
  },
  panelMeta: {
    color: colors.muted,
    fontSize: 13
  },
  portalList: {
    gap: 10
  },
  portalButton: {
    minHeight: 76,
    borderWidth: 1,
    borderColor: '#dbe5ef',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer'
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
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  portalText: {
    flex: 1,
    minWidth: 0
  },
  portalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text
  },
  portalLabel: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 13
  },
  portalRight: {
    alignItems: 'flex-end',
    gap: 6
  },
  portalStatus: {
    fontSize: 12,
    fontWeight: '700'
  },
  nextBand: {
    minHeight: 72,
    borderTopWidth: 1,
    borderTopColor: '#dbe5ef',
    backgroundColor: '#ffffff',
    paddingHorizontal: 28,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    flexWrap: 'wrap'
  },
  nextTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text
  },
  nextText: {
    maxWidth: 760,
    color: colors.muted,
    lineHeight: 21
  },
  section: {
    width: '100%',
    maxWidth: 1180,
    marginHorizontal: 'auto',
    paddingHorizontal: 28,
    paddingVertical: 46
  },
  sectionIntro: {
    maxWidth: 780,
    gap: 10,
    marginBottom: 24
  },
  kicker: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  sectionTitle: {
    fontSize: 32,
    lineHeight: 39,
    fontWeight: '800',
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
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
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
    fontSize: 34,
    fontWeight: '900',
    color: colors.primary
  },
  metricLabel: {
    color: colors.slate,
    fontWeight: '700'
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
    fontWeight: '800',
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
    fontWeight: '900'
  },
  stepTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800'
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
    fontWeight: '700'
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
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  locationValue: {
    marginTop: 6,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22
  },
  contactBar: {
    minHeight: 112,
    borderWidth: 1,
    borderColor: '#dbe5ef',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap'
  },
  contactIcon: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  contactText: {
    flex: 1,
    minWidth: 260,
    gap: 5
  },
  contactTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text
  },
  contactBody: {
    color: colors.muted,
    lineHeight: 22
  },
  contactAction: {
    minHeight: 42,
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer'
  },
  contactActionText: {
    color: '#ffffff',
    fontWeight: '700'
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
    fontWeight: '800'
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
