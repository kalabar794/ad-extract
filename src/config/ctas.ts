/**
 * Common CTA patterns to detect and categorize
 */

export const ctaPatterns = {
  // Action-oriented
  action: [
    'Shop Now',
    'Buy Now',
    'Order Now',
    'Get Started',
    'Start Now',
    'Try Now',
    'Join Now',
    'Sign Up',
    'Subscribe',
    'Download',
    'Install',
    'Apply Now',
    'Book Now',
    'Reserve Now',
    'Claim Now'
  ],

  // Information-seeking
  information: [
    'Learn More',
    'See More',
    'Read More',
    'Find Out More',
    'Discover',
    'Explore',
    'View Details',
    'See Details',
    'Get Details',
    'View More'
  ],

  // Contact/Engagement
  contact: [
    'Contact Us',
    'Get in Touch',
    'Call Now',
    'Message Us',
    'Chat Now',
    'Request Info',
    'Request Quote',
    'Get Quote',
    'Schedule Call',
    'Book Consultation'
  ],

  // Free offers
  freeOffer: [
    'Get Free',
    'Try Free',
    'Free Trial',
    'Start Free',
    'Free Quote',
    'Free Consultation',
    'Free Download',
    'Free Sample'
  ],

  // Urgency
  urgency: [
    'Limited Time',
    'Act Now',
    'Don\'t Miss',
    "Don't Wait",
    'Last Chance',
    'Ends Soon',
    'While Supplies Last',
    'Today Only'
  ]
};

/**
 * Flatten all CTA patterns into a single array
 */
export const allCTAs = Object.values(ctaPatterns).flat();

/**
 * Detect CTA in text and return the matched CTA and its category
 */
export function detectCTA(text: string): { cta: string; category: string } | null {
  const normalizedText = text.toLowerCase();

  for (const [category, patterns] of Object.entries(ctaPatterns)) {
    for (const pattern of patterns) {
      if (normalizedText.includes(pattern.toLowerCase())) {
        return { cta: pattern, category };
      }
    }
  }

  return null;
}

/**
 * Extract all CTAs from text
 */
export function extractAllCTAs(text: string): Array<{ cta: string; category: string }> {
  const normalizedText = text.toLowerCase();
  const found: Array<{ cta: string; category: string }> = [];

  for (const [category, patterns] of Object.entries(ctaPatterns)) {
    for (const pattern of patterns) {
      if (normalizedText.includes(pattern.toLowerCase())) {
        found.push({ cta: pattern, category });
      }
    }
  }

  return found;
}
