/**
 * Tests for Strategic Intelligence Analyzer
 */

import { generateStrategicAnalysis } from '../analyzers/strategic-intelligence';
import { Ad, AdCategory } from '../types/ad';

// Helper to create mock ads
function createMockAd(overrides: Partial<Ad> = {}): Ad {
  return {
    id: `ad-${Math.random().toString(36).substr(2, 9)}`,
    competitor: 'Test Company',
    platform: 'meta',
    extractedAt: new Date().toISOString(),
    primaryText: 'Test ad copy',
    hashtags: [],
    category: AdCategory.OTHER,
    ...overrides
  };
}

describe('Strategic Intelligence Analyzer', () => {
  describe('generateStrategicAnalysis', () => {
    it('should generate analysis from array of ads', () => {
      const ads: Ad[] = [
        createMockAd({ primaryText: 'Become the dentist everyone knows and trusts. Grab the free starter pack now!' }),
        createMockAd({ primaryText: 'Become the dentist everyone knows and trusts. Download free guide!' }),
        createMockAd({ primaryText: 'Dr. Smith saw 196% growth after partnering with us.' }),
      ];

      const analysis = generateStrategicAnalysis('Test Company', ads);

      expect(analysis).toBeDefined();
      expect(analysis.competitor).toBe('Test Company');
      expect(analysis.totalAds).toBe(3);
      expect(analysis.campaigns).toBeDefined();
      expect(Array.isArray(analysis.campaigns)).toBe(true);
    });

    it('should identify Celebrity Dentist campaign theme', () => {
      const ads: Ad[] = [
        createMockAd({ primaryText: 'Become the dentist everyone knows and trusts.' }),
        createMockAd({ primaryText: 'Become the dentist everyone knows and trusts. Get started!' }),
        createMockAd({ primaryText: 'The omni-dentist starter pack is here!' }),
      ];

      const analysis = generateStrategicAnalysis('Test Company', ads);

      // Should have at least one campaign identified
      expect(analysis.campaigns.length).toBeGreaterThan(0);

      // Check if Celebrity Dentist is identified
      const celebrityCampaign = analysis.campaigns.find(c => c.name === 'Celebrity Dentist');
      expect(celebrityCampaign).toBeDefined();
    });

    it('should extract case studies from ads mentioning doctors', () => {
      const ads: Ad[] = [
        createMockAd({ primaryText: 'Dr. Mahmood saw a 196% surge in calls after implementing our strategy.' }),
        createMockAd({ primaryText: 'Dr. Smith 4x\'d his patients in just 6 months.' }),
        createMockAd({ primaryText: 'Silberman Dental went from 12 to 42 patients per month.' }),
      ];

      const analysis = generateStrategicAnalysis('Test Company', ads);

      expect(analysis.caseStudies.length).toBeGreaterThan(0);

      // Check for specific metrics extraction
      const mahmoodCase = analysis.caseStudies.find(cs => cs.name.includes('Mahmood'));
      expect(mahmoodCase).toBeDefined();
      expect(mahmoodCase?.result).toContain('196%');
    });

    it('should categorize pain points correctly', () => {
      const ads: Ad[] = [
        createMockAd({ primaryText: 'Tired of agencies that ghost you? We never do.' }),
        createMockAd({ primaryText: 'Scattered marketing costing more than it makes?' }),
        createMockAd({ primaryText: 'Empty calendar? Stagnant growth?' }),
      ];

      const analysis = generateStrategicAnalysis('Test Company', ads);

      expect(analysis.painPointCategories.length).toBeGreaterThan(0);

      // Should have Agency Problems category
      const agencyProblems = analysis.painPointCategories.find(pp => pp.category === 'Agency Problems');
      expect(agencyProblems).toBeDefined();
    });

    it('should extract value propositions from ad copy', () => {
      const ads: Ad[] = [
        createMockAd({ primaryText: 'Get results in 90 days with our turn-key system.' }),
        createMockAd({ primaryText: 'We are your strategic partner, not just a vendor.' }),
        createMockAd({ primaryText: 'Since 1999, we have helped 2,500+ practices grow.' }),
      ];

      const analysis = generateStrategicAnalysis('Test Company', ads);

      expect(analysis.valuePropositions.length).toBeGreaterThan(0);

      // Should have Speed proposition
      const speedProp = analysis.valuePropositions.find(vp => vp.label === 'Speed');
      expect(speedProp).toBeDefined();
    });

    it('should estimate investment based on ad count', () => {
      const ads: Ad[] = Array(30).fill(null).map(() =>
        createMockAd({ startDate: '2025-06-01' })
      );

      const analysis = generateStrategicAnalysis('Test Company', ads);

      expect(analysis.investment).toBeDefined();
      expect(analysis.investment.conservative).toContain('$');
      expect(analysis.investment.aggressive).toContain('$');
    });

    it('should identify strengths when many case studies exist', () => {
      const ads: Ad[] = [
        createMockAd({ primaryText: 'Dr. A saw 100% growth.' }),
        createMockAd({ primaryText: 'Dr. B saw 150% growth.' }),
        createMockAd({ primaryText: 'Dr. C saw 200% growth.' }),
        createMockAd({ primaryText: 'Dr. D saw 250% growth.' }),
      ];

      const analysis = generateStrategicAnalysis('Test Company', ads);

      expect(analysis.strengths.length).toBeGreaterThan(0);

      // Should identify testimonial factory strength
      const testimonialStrength = analysis.strengths.find(s =>
        s.title.toLowerCase().includes('testimonial')
      );
      expect(testimonialStrength).toBeDefined();
    });

    it('should handle empty ads array', () => {
      const analysis = generateStrategicAnalysis('Test Company', []);

      expect(analysis).toBeDefined();
      expect(analysis.totalAds).toBe(0);
      expect(analysis.campaigns).toEqual([]);
    });
  });
});
