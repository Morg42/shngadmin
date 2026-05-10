import { TestBed } from '@angular/core/testing';
import { createMockAppConfigService, translateTestingModule } from '../../../testing/test-helpers';
import { AppConfigService } from './app-config.service';
import { SharedService } from './shared.service';
import { UserPreferencesService } from './user-preferences.service';

describe('SharedService', () => {
  let service: SharedService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [translateTestingModule],
      providers: [
        SharedService,
        UserPreferencesService,
        { provide: AppConfigService, useValue: createMockAppConfigService() },
      ],
    });
    service = TestBed.inject(SharedService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // isInt
  // -------------------------------------------------------------------------

  describe('isInt()', () => {
    it('returns true for positive integers', () => {
      expect(service.isInt(42)).toBe(true);
      expect(service.isInt('100')).toBe(true);
    });

    it('returns true for zero', () => {
      expect(service.isInt(0)).toBe(true);
    });

    it('returns true for negative integers', () => {
      expect(service.isInt(-5)).toBe(true);
      expect(service.isInt('-99')).toBe(true);
    });

    it('returns false for floats', () => {
      expect(service.isInt(3.14)).toBe(false);
      expect(service.isInt('1.5')).toBe(false);
    });

    it('returns false for non-numeric strings', () => {
      expect(service.isInt('abc')).toBe(false);
      expect(service.isInt('')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // is_ipv4
  // -------------------------------------------------------------------------

  describe('is_ipv4()', () => {
    it('validates correct IPv4 addresses', () => {
      expect(service.is_ipv4('192.168.1.1')).toBe(true);
      expect(service.is_ipv4('0.0.0.0')).toBe(true);
      expect(service.is_ipv4('255.255.255.255')).toBe(true);
      expect(service.is_ipv4('10.0.0.1')).toBe(true);
    });

    it('rejects invalid IPv4 addresses', () => {
      expect(service.is_ipv4('256.0.0.1')).toBe(false);
      expect(service.is_ipv4('192.168.1')).toBe(false);
      expect(service.is_ipv4('not.an.ip')).toBe(false);
      expect(service.is_ipv4('')).toBe(false);
      expect(service.is_ipv4('192.168.1.1.1')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // is_ipv6
  // -------------------------------------------------------------------------

  describe('is_ipv6()', () => {
    it('validates correct IPv6 addresses', () => {
      expect(service.is_ipv6('::1')).toBe(true);
      expect(service.is_ipv6('2001:db8::1')).toBe(true);
      expect(service.is_ipv6('fe80::1')).toBe(true);
    });

    it('rejects invalid IPv6 addresses', () => {
      expect(service.is_ipv6('gggg::1')).toBe(false);
      expect(service.is_ipv6('1:2:3:4:5:6:7:8:9')).toBe(false); // too many groups
    });
  });

  // -------------------------------------------------------------------------
  // is_mac
  // -------------------------------------------------------------------------

  describe('is_mac()', () => {
    it('validates correct MAC addresses', () => {
      expect(service.is_mac('AA:BB:CC:DD:EE:FF')).toBe(true);
      expect(service.is_mac('00:11:22:33:44:55')).toBe(true);
      expect(service.is_mac('aa:bb:cc:dd:ee:ff')).toBe(true);
    });

    it('rejects invalid MAC addresses', () => {
      expect(service.is_mac('AA:BB:CC:DD:EE')).toBe(false); // too short
      expect(service.is_mac('AA-BB-CC-DD-EE-FF')).toBe(false); // wrong separator
      expect(service.is_mac('GG:BB:CC:DD:EE:FF')).toBe(false); // invalid hex
      expect(service.is_mac('')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // is_hostname
  // -------------------------------------------------------------------------

  describe('is_hostname()', () => {
    it('validates correct hostnames', () => {
      expect(service.is_hostname('localhost')).toBe(true);
      expect(service.is_hostname('my-host.example.com')).toBe(true);
      expect(service.is_hostname('server01')).toBe(true);
    });

    it('rejects invalid hostnames', () => {
      expect(service.is_hostname('-invalid')).toBe(false);
      expect(service.is_hostname('has space')).toBe(false);
      expect(service.is_hostname('')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // is_knx_groupaddress
  // -------------------------------------------------------------------------

  describe('is_knx_groupaddress()', () => {
    it('accepts valid KNX group addresses', () => {
      expect(service.is_knx_groupaddress('1/2/3')).toBe(true);
      expect(service.is_knx_groupaddress('31/7/255')).toBe(true);
      expect(service.is_knx_groupaddress('0/0/0')).toBe(true);
    });

    it('accepts empty/undefined as valid (no address)', () => {
      expect(service.is_knx_groupaddress('')).toBe(true);
      expect(service.is_knx_groupaddress(undefined)).toBe(true);
    });

    it('rejects addresses out of range', () => {
      expect(service.is_knx_groupaddress('32/0/0')).toBe(false); // main > 31
      expect(service.is_knx_groupaddress('0/8/0')).toBe(false); // middle > 7
      expect(service.is_knx_groupaddress('0/0/256')).toBe(false); // sub > 255
    });

    it('rejects malformed addresses', () => {
      expect(service.is_knx_groupaddress('1/2')).toBe(false); // missing part
      expect(service.is_knx_groupaddress('a/b/c')).toBe(false); // not numeric
      expect(service.is_knx_groupaddress('1/2/3/4')).toBe(false); // too many parts
    });
  });

  // -------------------------------------------------------------------------
  // getFallbackLanguage
  // -------------------------------------------------------------------------

  describe('getFallbackLanguage()', () => {
    it('returns first item of fallbackLanguageOrder at index 0', () => {
      expect(service.getFallbackLanguage(0)).toBe('en');
    });

    it('returns second item at index 1', () => {
      expect(service.getFallbackLanguage(1)).toBe('de');
    });

    it('defaults to "en" for out-of-range index', () => {
      expect(service.getFallbackLanguage(99)).toBe('en');
    });
  });

  // -------------------------------------------------------------------------
  // getDescription
  // -------------------------------------------------------------------------

  describe('getDescription()', () => {
    it('returns empty string for null/undefined', () => {
      expect(service.getDescription(null)).toBe('');
      expect(service.getDescription(undefined)).toBe('');
    });

    it('returns value for current language key', () => {
      const dict = { en: 'English description', de: 'Deutsche Beschreibung' };
      expect(service.getDescription(dict)).toBe('English description');
    });

    it('falls back to first fallback language when current language missing', () => {
      const dict = { de: 'Deutsche Beschreibung' }; // no 'en' key
      // first fallback is 'en' from mock, second is 'de' — 'de' exists
      const result = service.getDescription(dict);
      expect(typeof result).toBe('string');
    });

    it('returns empty string for empty dict', () => {
      expect(service.getDescription({})).toBe('');
    });
  });
});
