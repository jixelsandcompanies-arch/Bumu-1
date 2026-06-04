import React, { useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
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

const heroPhoto = '/landing/paygo-hero.png';
const bikePhoto = '/landing/paygo-motorbike.png';
const phonePhoto = '/landing/paygo-phone.png';
const cookerPhoto = '/landing/paygo-cooker.png';
const solarPhoto = '/landing/paygo-solar.png';

const productShowcase = [
  ['Motorbikes', 'Income-ready motorcycles with deposits and instalments built around daily cash flow.', bikePhoto],
  ['Smartphones', 'Connected devices customers can start using now and pay for over time.', phonePhoto],
  ['Cookers and home assets', 'Practical household products for families and small businesses.', cookerPhoto],
  ['Solar and lighting', 'Lighting and small energy products for homes, shops, and field work.', solarPhoto]
];

const navItems = [
  ['Home', 'home'],
  ['Portals', 'portals'],
  ['About', 'about'],
  ['Products', 'products'],
  ['Services', 'services'],
  ['Location', 'location'],
  ['Contact', 'contact']
];

const paygoProducts = [
  ['Motorbikes', 'For riders and businesses that need mobility without one large upfront payment.'],
  ['Smartphones', 'For customers who need reliable connected devices and flexible repayment.'],
  ['Home assets', 'Cookers, lockers, appliances, and household tools supplied through approved plans.'],
  ['Solar energy', 'Lighting and small energy products for homes, shops, and workspaces.']
];

const serviceHighlights = [
  {
    title: 'Simple start',
    text: 'Customers choose an approved product, pay the deposit, and begin a clear repayment journey.'
  },
  {
    title: 'Mobile money ready',
    text: 'Payments are prepared for familiar Kenyan mobile money flows through secured backend integrations.'
  },
  {
    title: 'Field support',
    text: 'Agents and dealers help customers apply, understand the plan, and stay on track after delivery.'
  }
];

const locationDetails = [
  ['Base', 'Nairobi, Kenya'],
  ['Coverage', 'Dealer network planned across Kenya'],
  ['Products', 'Motorbikes, phones, cookers, solar lamps, and approved assets'],
  ['Support', 'Customer, agent, dealer, and finance support channels']
];

const operatingSteps = [
  ['Choose', 'Pick a product that fits work, home, mobility, or energy needs.'],
  ['Apply', 'Submit the required details through an agent or approved channel.'],
  ['Start', 'Pay the deposit after approval and receive the product.'],
  ['Grow', 'Continue with scheduled instalments and support when needed.']
];

const trustSignals = [
  'Lipa mdogo mdogo',
  'Nairobi operations',
  'Dealer network across Kenya'
];

export function PortalLandingScreen() {
  const [page, setPage] = useState('home');

  function scrollTop() {
    requestAnimationFrame(() => document.getElementById('site-top')?.scrollIntoView({ block: 'start' }));
  }

  function openHome() {
    setPage('home');
    scrollTop();
  }

  function openPortalPage() {
    setPage('portals');
    scrollTop();
  }

  function openSitePage(target) {
    if (target === 'home') {
      openHome();
      return;
    }

    if (target === 'portals') {
      openPortalPage();
      return;
    }

    setPage(target);
    scrollTop();
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

  const activeNav = navItems.find(([, target]) => target === page)?.[0] || 'Home';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator>
      <View style={styles.siteShell} id="site-top">
        <View style={styles.sideMenu}>
          <Pressable onPress={openHome} style={styles.sideBrand}>
            <Image source={bumuLogo} style={styles.sideLogo} />
            <View>
              <Text style={styles.sideTitle}>Bumu Paygo</Text>
              <Text style={styles.sideMeta}>Nairobi, Kenya</Text>
            </View>
          </Pressable>
          <View style={styles.sideDivider} />
          <Text style={styles.sideGroupLabel}>Website</Text>
          <View style={styles.sideNavLinks}>
            {navItems.map(([label, target]) => {
              const active = page === target || (page === 'home' && target === 'home');
              return (
                <Pressable
                  key={target}
                  onPress={() => openSitePage(target)}
                  style={[styles.sideNavLink, active && styles.sideNavLinkActive]}
                >
                  <Text style={[styles.sideNavText, active && styles.sideNavTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.sideFooter}>
            <Text style={styles.sideFooterTitle}>PAYGO access</Text>
            <Text style={styles.sideFooterText}>Motorbikes, phones, cookers, solar and approved products.</Text>
          </View>
        </View>

        <View style={styles.siteMain}>
          <View style={styles.financeHeader}>
            <View>
              <Text style={styles.headerKicker}>Bumu Paygo</Text>
              <Text style={styles.headerTitle}>{activeNav}</Text>
              <Text style={styles.headerText}>Products today. Payments over time.</Text>
            </View>
            <Pressable onPress={openPortalPage} style={styles.headerPortalButton}>
              <Text style={styles.headerPortalText}>Portals</Text>
              <ArrowRight size={17} color="#ffffff" />
            </Pressable>
          </View>

          <View style={styles.pageContent}>
      {page === 'portals' ? (
        <PortalCardsPage onBack={openHome} onOpenPortal={openPortal} />
      ) : page === 'products' ? (
        <ProductsPage onOpenPortals={openPortalPage} />
      ) : page === 'services' ? (
        <ServicesPage onOpenPortals={openPortalPage} />
      ) : page === 'about' ? (
        <AboutPage onOpenPortals={openPortalPage} />
      ) : page === 'location' ? (
        <LocationPage />
      ) : page === 'contact' ? (
        <ContactPage onOpenPortals={openPortalPage} />
      ) : (
        <>
      <View style={styles.hero}>
        <View style={styles.heroAccent} />

        <View style={styles.heroInner}>
          <View style={styles.brandBlock}>
            <View style={styles.brandRow}>
              <Image source={bumuLogo} style={styles.logo} />
              <View>
                <Text style={styles.brandName}>Bumu Paygo</Text>
                <Text style={styles.brandMeta}>Premium PAYGO products</Text>
              </View>
            </View>
            <Text style={styles.title}>Bumu Paygo</Text>
            <Text style={styles.subtitle}>
              Get useful products now and pay over time. Bumu supports motorbikes, phones, cookers, solar products, and approved assets for work and home.
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
            <View style={styles.trustRow}>
              {trustSignals.map((item) => (
                <View key={item} style={styles.trustItem}>
                  <CheckCircle2 size={16} color="#d4a742" />
                  <Text style={styles.trustText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.heroVisual}>
            <Image source={{ uri: heroPhoto }} style={styles.heroPhoto} resizeMode="cover" />
            <View style={styles.heroPhotoShade} />
            <View style={styles.heroVisualCaption}>
              <Text style={styles.visualKicker}>Lipa mdogo mdogo</Text>
              <Text style={styles.visualTitle}>Start with what you need.</Text>
              <Text style={styles.visualText}>Flexible access for mobility, communication, cooking, lighting, and trade.</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section} id="about">
        <View style={styles.sectionIntro}>
          <Text style={styles.kicker}>About</Text>
          <Text style={styles.sectionTitle}>A practical way to own what matters</Text>
          <Text style={styles.sectionText}>
            Bumu helps people and small businesses access products that improve daily life, support income, and spread cost into manageable payments.
          </Text>
        </View>
        <View style={styles.aboutGrid}>
          <View style={styles.aboutMain}>
            <Building2 size={24} color={colors.primary} />
            <Text style={styles.aboutTitle}>Built for real Kenyan needs</Text>
            <Text style={styles.aboutText}>
              From a rider needing a motorbike to a family needing a cooker or solar light, Bumu keeps the journey clear: apply, pay deposit, receive the product, and continue with agreed instalments.
            </Text>
          </View>
          <View style={styles.metricStack}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>4+</Text>
              <Text style={styles.metricLabel}>Product categories</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>KE</Text>
              <Text style={styles.metricLabel}>Kenya-focused service</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.section, styles.productsSection]} id="products">
        <View style={styles.sectionIntro}>
          <Text style={styles.kicker}>Products</Text>
          <Text style={styles.sectionTitle}>Products customers can use immediately</Text>
          <Text style={styles.sectionText}>
            Bumu supports products that bring value from day one, with repayment plans matched to the customer and the asset.
          </Text>
        </View>
        <View style={styles.productGrid}>
          {paygoProducts.map(([title, text], index) => (
            <View key={title} style={styles.productCard}>
              <Text style={styles.productNumber}>{String(index + 1).padStart(2, '0')}</Text>
              <Text style={styles.productTitle}>{title}</Text>
              <Text style={styles.productText}>{text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.section, styles.serviceSection]} id="services">
        <View style={styles.sectionIntro}>
          <Text style={styles.kicker}>Services</Text>
          <Text style={styles.sectionTitle}>Service from application to after-sale support</Text>
          <Text style={styles.sectionText}>
            Agents, dealers, and support teams help customers understand the product, payment plan, and next step at every stage.
          </Text>
        </View>
        <View style={styles.serviceShowcase}>
          <Image source={{ uri: phonePhoto }} style={styles.servicePhoto} resizeMode="cover" />
          <View style={styles.highlights}>
            {serviceHighlights.map((item) => (
              <View key={item.title} style={styles.highlightCard}>
                <Text style={styles.highlightTitle}>{item.title}</Text>
                <Text style={styles.highlightText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.processBand}>
        <View style={styles.section}>
          <View style={styles.sectionIntro}>
            <Text style={styles.kicker}>Workflow</Text>
          <Text style={styles.sectionTitle}>A clear path from need to ownership</Text>
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
            Bumu is based in Nairobi and is building dealer coverage across Kenya so customers can access approved PAYGO products closer to where they live and work.
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
              <Text style={styles.footerText}>Products today. Payments over time.</Text>
            </View>
          </View>
          <View style={styles.footerLinks}>
            <View style={styles.footerItem}>
              <MapPin size={16} color={colors.primary} />
              <Text style={styles.footerText}>Nairobi, Kenya</Text>
            </View>
            <View style={styles.footerItem}>
              <Phone size={16} color={colors.success} />
              <Text style={styles.footerText}>+254 700 000 000</Text>
            </View>
            <View style={styles.footerItem}>
              <Mail size={16} color={colors.orange} />
              <Text style={styles.footerText}>info@bumupaygo.co.ke</Text>
            </View>
          </View>
        </View>
      </View>
        </>
      )}
          </View>
        </View>
      </View>
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
            Finance, Admin, Agent, and Customer workspaces are available for approved users.
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

function ProductsPage({ onOpenPortals }) {
  return (
    <View style={styles.detailPage}>
      <View style={styles.detailHero}>
        <View style={styles.detailCopy}>
          <Text style={styles.kicker}>Products</Text>
          <Text style={styles.detailTitle}>Products for mobility, home, energy, and work</Text>
          <Text style={styles.detailText}>
            Bumu focuses on products customers can use immediately while paying in structured instalments. Each category can be offered with a deposit, repayment schedule, and support.
          </Text>
          <Pressable onPress={onOpenPortals} style={styles.primaryInlineAction}>
            <Text style={styles.primaryInlineText}>Open portals</Text>
            <ArrowRight size={17} color="#ffffff" />
          </Pressable>
        </View>
        <Image source={{ uri: heroPhoto }} style={styles.detailHeroImage} resizeMode="cover" />
      </View>

      <View style={styles.showcaseGrid}>
        {productShowcase.map(([title, text, image]) => (
          <View key={title} style={styles.showcaseCard}>
            <Image source={{ uri: image }} style={styles.showcaseImage} resizeMode="cover" />
            <View style={styles.showcaseBody}>
              <Text style={styles.showcaseTitle}>{title}</Text>
              <Text style={styles.showcaseText}>{text}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.statementBand}>
        <Text style={styles.statementTitle}>If it helps people move, work, cook, connect, or power life, it can fit PAYGO.</Text>
        <Text style={styles.statementText}>
          Motorbikes, phones, cookers, solar lamps, appliances, business tools, and dealer-approved assets can be structured for instalment payments after customer approval.
        </Text>
      </View>
    </View>
  );
}

function ServicesPage({ onOpenPortals }) {
  return (
    <View style={styles.detailPage}>
      <View style={styles.pageHeader}>
        <Text style={styles.kicker}>Services</Text>
        <Text style={styles.detailTitle}>A premium service experience from application to support</Text>
        <Text style={styles.detailText}>
          Bumu combines product access, dealer service, repayment guidance, and follow-up so customers know exactly what to expect before and after approval.
        </Text>
      </View>

      <View style={styles.serviceDetailGrid}>
        {[
          ['Applications', 'Agents collect the required details for approval and product allocation.'],
          ['Customer care', 'Customers receive guidance on balances, repayments, product status, and next steps.'],
          ['Dealer coordination', 'Approved dealers and field teams support onboarding and after-sale service.'],
          ['Mobile money readiness', 'Payment journeys are prepared for secured mobile money integrations.'],
          ['Finance visibility', 'Collections, commissions, reports, and payment outcomes remain controlled by role.'],
          ['Follow-up', 'Support history stays connected so teams can respond quickly and consistently.']
        ].map(([title, text]) => (
          <View key={title} style={styles.serviceDetailCard}>
            <CheckCircle2 size={20} color={colors.success} />
            <Text style={styles.serviceDetailTitle}>{title}</Text>
            <Text style={styles.serviceDetailText}>{text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.wideMediaPanel}>
        <Image source={{ uri: solarPhoto }} style={styles.wideMediaImage} resizeMode="cover" />
        <View style={styles.wideMediaCopy}>
          <Text style={styles.kicker}>For customers and teams</Text>
          <Text style={styles.sectionTitle}>Built for the way customers already pay</Text>
          <Text style={styles.sectionText}>
            Customers can use familiar mobile money journeys while Bumu teams and approved dealers keep service clear, professional, and accountable.
          </Text>
          <Pressable onPress={onOpenPortals} style={styles.secondaryInlineAction}>
            <Text style={styles.secondaryInlineText}>Portal access</Text>
            <ArrowRight size={17} color={colors.primary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function AboutPage({ onOpenPortals }) {
  return (
    <View style={styles.detailPage}>
      <View style={styles.detailHero}>
        <View style={styles.detailCopy}>
          <Text style={styles.kicker}>About BUMU</Text>
          <Text style={styles.detailTitle}>Making useful products easier to own</Text>
          <Text style={styles.detailText}>
            Bumu Paygo exists for customers who need products that help them earn, move, cook, communicate, and power daily life without paying the full amount upfront.
          </Text>
          <Text style={styles.detailText}>
            The company is built from Nairobi with a Kenya-wide dealer vision: practical products, respectful service, transparent repayment expectations, and accountable support.
          </Text>
          <Pressable onPress={onOpenPortals} style={styles.primaryInlineAction}>
            <Text style={styles.primaryInlineText}>Open portals</Text>
            <ArrowRight size={17} color="#ffffff" />
          </Pressable>
        </View>
        <Image source={{ uri: cookerPhoto }} style={styles.detailHeroImage} resizeMode="cover" />
      </View>

      <View style={styles.valueGrid}>
        {[
          ['Practical', 'Products are selected for real daily use, not only appearance.'],
          ['Accessible', 'Customers can begin with a deposit and continue with planned instalments.'],
          ['Professional', 'Agents, dealers, customers, and finance teams use clear role-based journeys.'],
          ['Kenyan', 'Nairobi-based operations with dealer coverage planned across the country.']
        ].map(([title, text]) => (
          <View key={title} style={styles.valueCard}>
            <Text style={styles.valueTitle}>{title}</Text>
            <Text style={styles.valueText}>{text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function LocationPage() {
  return (
    <View style={styles.detailPage}>
      <View style={styles.locationHero}>
        <View style={styles.locationPanel}>
          <MapPin size={28} color={colors.primary} />
          <Text style={styles.detailTitle}>Nairobi base with Kenya-wide ambition</Text>
          <Text style={styles.detailText}>
            Bumu operations are based in Nairobi. As dealer coverage grows, customers will be able to access approved products through trusted field channels across Kenya.
          </Text>
        </View>
        <View style={styles.locationCards}>
          {locationDetails.map(([label, value]) => (
            <View key={label} style={styles.locationItem}>
              <Text style={styles.locationLabel}>{label}</Text>
              <Text style={styles.locationValue}>{value}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.statementBand}>
        <Text style={styles.statementTitle}>Office visits, customer support, and dealer onboarding</Text>
        <Text style={styles.statementText}>
          Customers, agents, and dealers can use the contact channels to confirm visits, product availability, support needs, and onboarding information.
        </Text>
      </View>
    </View>
  );
}

function ContactPage({ onOpenPortals }) {
  return (
    <View style={styles.detailPage}>
      <View style={styles.pageHeader}>
        <Text style={styles.kicker}>Contact</Text>
        <Text style={styles.detailTitle}>Talk to Bumu about products, dealers, or support</Text>
        <Text style={styles.detailText}>
          Reach the team for product information, dealer enquiries, customer support, or approved portal access.
        </Text>
      </View>

      <View style={styles.contactGrid}>
        <View style={styles.contactCard}>
          <Phone size={22} color={colors.success} />
          <Text style={styles.contactTitle}>Phone</Text>
          <Text style={styles.contactText}>+254 700 000 000</Text>
        </View>
        <View style={styles.contactCard}>
          <Mail size={22} color={colors.orange} />
          <Text style={styles.contactTitle}>Email</Text>
          <Text style={styles.contactText}>info@bumupaygo.co.ke</Text>
        </View>
        <View style={styles.contactCard}>
          <Building2 size={22} color={colors.primary} />
          <Text style={styles.contactTitle}>Office</Text>
          <Text style={styles.contactText}>Nairobi, Kenya</Text>
        </View>
      </View>

      <View style={styles.contactBand}>
        <View>
          <Text style={styles.statementTitle}>Approved users can access their workspace from the portals.</Text>
          <Text style={styles.statementText}>
            Customer, agent, finance, and admin access stays separated by role while the public website stays open for everyone.
          </Text>
        </View>
        <Pressable onPress={onOpenPortals} style={styles.primaryInlineAction}>
          <Text style={styles.primaryInlineText}>Open portals</Text>
          <ArrowRight size={17} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: 'var(--app-vh)',
    width: '100%',
    backgroundColor: '#f6f9fc',
    overflowY: 'auto'
  },
  content: {
    minHeight: 'var(--app-vh)',
    paddingBottom: 0
  },
  siteShell: {
    minHeight: 'var(--app-vh)',
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#eef5fb'
  },
  sideMenu: {
    width: 276,
    minHeight: 'var(--app-vh)',
    backgroundColor: '#07152b',
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 18,
    gap: 14,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.10)'
  },
  sideBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer'
  },
  sideLogo: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2f84ff'
  },
  sideTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600'
  },
  sideMeta: {
    color: '#9fb3c8',
    fontSize: 12,
    marginTop: 2
  },
  sideDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: 4
  },
  sideGroupLabel: {
    color: '#8ba3bf',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase'
  },
  sideNavLinks: {
    gap: 6
  },
  sideNavLink: {
    minHeight: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    cursor: 'pointer'
  },
  sideNavLinkActive: {
    backgroundColor: colors.primary
  },
  sideNavText: {
    color: '#dbeafe',
    fontSize: 14,
    fontWeight: '500'
  },
  sideNavTextActive: {
    color: '#ffffff',
    fontWeight: '600'
  },
  sideFooter: {
    marginTop: 'auto',
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.24)',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    gap: 5
  },
  sideFooterTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600'
  },
  sideFooterText: {
    color: '#b8c9df',
    fontSize: 12,
    lineHeight: 18
  },
  siteMain: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#f7faff'
  },
  financeHeader: {
    minHeight: 92,
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#d8e2f0',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap'
  },
  headerKicker: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  headerTitle: {
    color: colors.text,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '600',
    marginTop: 3
  },
  headerText: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 3
  },
  headerPortalButton: {
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
  headerPortalText: {
    color: '#ffffff',
    fontWeight: '600'
  },
  pageContent: {
    width: '100%'
  },
  nav: {
    minHeight: 66,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(28, 77, 145, 0.14)',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
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
    minHeight: 560,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(28, 77, 145, 0.18)',
    backgroundColor: '#081a35'
  },
  heroAccent: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'linear-gradient(135deg, rgba(8,26,53,0.96), rgba(17,78,164,0.88) 48%, rgba(212,167,66,0.26))'
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
    gap: 28,
    flexWrap: 'wrap'
  },
  brandBlock: {
    flex: 1.1,
    minWidth: 280,
    maxWidth: 690,
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
    borderColor: '#2f8cff'
  },
  brandName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff'
  },
  brandMeta: {
    color: '#bad2f2',
    marginTop: 2
  },
  title: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: '600',
    color: '#ffffff'
  },
  subtitle: {
    maxWidth: 620,
    fontSize: 19,
    lineHeight: 29,
    color: '#d8e6f8'
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
    backgroundColor: '#1667d8',
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
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  trustItem: {
    minHeight: 34,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.08)'
  },
  trustText: {
    color: '#eef6ff',
    fontSize: 13,
    fontWeight: '500'
  },
  heroVisual: {
    flex: 0.9,
    minWidth: 300,
    minHeight: 430,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    boxShadow: '0 22px 70px rgba(2, 12, 27, 0.30)'
  },
  heroPhoto: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%'
  },
  heroPhotoShade: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'linear-gradient(180deg, rgba(8,26,53,0.06), rgba(8,26,53,0.88))'
  },
  heroVisualCaption: {
    position: 'relative',
    padding: 20,
    gap: 7
  },
  visualKicker: {
    color: '#d4a742',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  visualTitle: {
    color: '#ffffff',
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '600'
  },
  visualText: {
    color: '#d8e6f8',
    lineHeight: 22
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
    borderColor: '#d7e4f2',
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
  detailPage: {
    width: '100%',
    maxWidth: 1180,
    marginHorizontal: 'auto',
    paddingHorizontal: 28,
    paddingTop: 38,
    paddingBottom: 62,
    gap: 24
  },
  pageHeader: {
    maxWidth: 820,
    gap: 12,
    paddingTop: 10,
    paddingBottom: 8
  },
  detailHero: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 22,
    alignItems: 'stretch'
  },
  detailCopy: {
    flex: 1,
    minWidth: 300,
    borderWidth: 1,
    borderColor: '#d7e4f2',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 24,
    gap: 14,
    justifyContent: 'center'
  },
  detailTitle: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 43,
    fontWeight: '600'
  },
  detailText: {
    color: colors.slate,
    fontSize: 16,
    lineHeight: 25
  },
  detailHeroImage: {
    flex: 0.95,
    minWidth: 300,
    minHeight: 430,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d7e4f2'
  },
  primaryInlineAction: {
    alignSelf: 'flex-start',
    minHeight: 44,
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer'
  },
  primaryInlineText: {
    color: '#ffffff',
    fontWeight: '600'
  },
  secondaryInlineAction: {
    alignSelf: 'flex-start',
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#cfe0fb',
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer'
  },
  secondaryInlineText: {
    color: colors.primary,
    fontWeight: '600'
  },
  showcaseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  showcaseCard: {
    flexGrow: 1,
    flexBasis: 250,
    minHeight: 330,
    borderWidth: 1,
    borderColor: '#d7e4f2',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    overflow: 'hidden'
  },
  showcaseImage: {
    width: '100%',
    height: 190
  },
  showcaseBody: {
    padding: 16,
    gap: 8
  },
  showcaseTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '600'
  },
  showcaseText: {
    color: colors.muted,
    lineHeight: 22
  },
  statementBand: {
    borderWidth: 1,
    borderColor: '#d3e2f2',
    borderRadius: 8,
    backgroundColor: '#eef6ff',
    padding: 22,
    gap: 8
  },
  statementTitle: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '600'
  },
  statementText: {
    color: colors.slate,
    lineHeight: 24
  },
  serviceDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14
  },
  serviceDetailCard: {
    flexGrow: 1,
    flexBasis: 310,
    minHeight: 180,
    borderWidth: 1,
    borderColor: '#d7e4f2',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 18,
    gap: 9
  },
  serviceDetailTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600'
  },
  serviceDetailText: {
    color: colors.muted,
    lineHeight: 22
  },
  wideMediaPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: '#d7e4f2',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    overflow: 'hidden'
  },
  wideMediaImage: {
    flex: 0.9,
    minWidth: 300,
    minHeight: 360
  },
  wideMediaCopy: {
    flex: 1,
    minWidth: 300,
    padding: 24,
    gap: 12,
    justifyContent: 'center'
  },
  valueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14
  },
  valueCard: {
    flexGrow: 1,
    flexBasis: 250,
    minHeight: 150,
    borderWidth: 1,
    borderColor: '#d7e4f2',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 18,
    gap: 9
  },
  valueTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600'
  },
  valueText: {
    color: colors.muted,
    lineHeight: 22
  },
  locationHero: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    alignItems: 'stretch'
  },
  locationPanel: {
    flex: 1,
    minWidth: 300,
    borderWidth: 1,
    borderColor: '#d7e4f2',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 24,
    gap: 14,
    justifyContent: 'center'
  },
  locationCards: {
    flex: 0.95,
    minWidth: 300,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  contactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14
  },
  contactCard: {
    flexGrow: 1,
    flexBasis: 260,
    minHeight: 150,
    borderWidth: 1,
    borderColor: '#d7e4f2',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 18,
    gap: 9
  },
  contactTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600'
  },
  contactText: {
    color: colors.slate,
    lineHeight: 22
  },
  contactBand: {
    borderWidth: 1,
    borderColor: '#d3e2f2',
    borderRadius: 8,
    backgroundColor: '#eef6ff',
    padding: 22,
    gap: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between'
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
    borderColor: '#d7e4f2',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 22,
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
    borderColor: '#d7e4f2',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 18,
    justifyContent: 'center'
  },
  metricValue: {
    fontSize: 30,
    fontWeight: '600',
    color: '#1667d8'
  },
  metricLabel: {
    color: colors.slate,
    fontWeight: '500'
  },
  serviceSection: {
    paddingTop: 30
  },
  productsSection: {
    paddingTop: 34
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14
  },
  productCard: {
    flexGrow: 1,
    flexBasis: 240,
    minHeight: 180,
    borderWidth: 1,
    borderColor: '#d7e4f2',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 18,
    gap: 9
  },
  productNumber: {
    color: '#d4a742',
    fontSize: 13,
    fontWeight: '700'
  },
  productTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '600'
  },
  productText: {
    color: colors.muted,
    lineHeight: 22
  },
  serviceShowcase: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'stretch'
  },
  servicePhoto: {
    flex: 0.9,
    minWidth: 280,
    minHeight: 360,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d7e4f2'
  },
  highlights: {
    flex: 1.1,
    minWidth: 300,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14
  },
  highlightCard: {
    flex: 1,
    minWidth: 250,
    borderWidth: 1,
    borderColor: '#d7e4f2',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 20,
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
    backgroundColor: '#edf5ff',
    borderTopWidth: 1,
    borderTopColor: '#d7e4f2',
    borderBottomWidth: 1,
    borderBottomColor: '#d7e4f2'
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
    borderColor: '#cfe0f5',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 8
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#0f4fb7',
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
    borderTopColor: '#d7e4f2',
    borderBottomWidth: 1,
    borderBottomColor: '#d7e4f2'
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
    backgroundColor: '#07152b',
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
