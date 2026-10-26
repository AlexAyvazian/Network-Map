import importlib.util
from pathlib import Path
import unittest

MODULE_PATH = Path(__file__).resolve().parents[1] / 'canada-contact-email-crawl.py'
SPEC = importlib.util.spec_from_file_location('canada_contact_email_crawl', MODULE_PATH)
M = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)


class CanadaEmailDiscoveryTests(unittest.TestCase):
    def test_multiple_emails_from_one_hospital(self):
        page = '''
          <a href="mailto:patients@hospital.ca">Patients</a>
          <p>Accounts: billing@hospital.ca</p>
          <span>Careers: jobs@hospital.ca</span>
          <p>patients@hospital.ca</p>
        '''
        self.assertEqual(M.extract_emails(page), {
            'patients@hospital.ca','billing@hospital.ca','jobs@hospital.ca'
        })

    def test_french_and_english_contact_pages(self):
        links = M.contact_links(
            '<a href="/nous-joindre">Nous joindre</a>'
            '<a href="/contactez-nous">Contactez-nous</a>'
            '<a href="/careers">Careers</a>'
            '<a href="https://otherhospital.ca/contact">External</a>',
            'https://hospital.ca/', 6
        )
        self.assertIn('https://hospital.ca/nous-joindre', links)
        self.assertIn('https://hospital.ca/contactez-nous', links)
        self.assertNotIn('https://otherhospital.ca/contact', links)

    def test_website_crawl_uses_only_reviewed_sites(self):
        self.assertIn("official_registry_contact_websites", M.CANADA_CRAWL_SQL)
        self.assertIn("facility_verified", M.CANADA_CRAWL_SQL)
        self.assertIn("organization_verified", M.CANADA_CRAWL_SQL)
        self.assertNotIn("candidate_unreviewed", M.CANADA_CRAWL_SQL)
        self.assertIn("country_code='CA'", M.CANADA_CRAWL_SQL)

    def test_emails_from_website_remain_review_candidates(self):
        self.assertEqual(M.NEW_DISCOVERY_STATUS, 'candidate_unreviewed')

    def test_unsafe_site_is_not_crawled(self):
        self.assertIsNone(M.safe_site_url('http://127.0.0.1/secrets'))
        self.assertIsNone(M.safe_site_url('file:///etc/passwd'))
        self.assertEqual(M.safe_site_url('www.hospital.ca'), 'https://www.hospital.ca/')

    def test_does_not_generate_guessed_email_addresses(self):
        self.assertEqual(M.extract_emails('https://hospital.ca/contact/'), set())


if __name__ == '__main__':
    unittest.main()
