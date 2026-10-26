import importlib.util
import pathlib
import unittest

PATH = pathlib.Path(__file__).resolve().parents[1] / 'argentina-contact-email-crawl.py'
SPEC = importlib.util.spec_from_file_location('argentina_contact_crawler', PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ContactEmailExtractionTests(unittest.TestCase):
    def test_extracts_all_distinct_literal_emails_including_mailto(self):
        html = '''<a href="mailto:Turnos@Hospital.org.ar?subject=Consulta">Turnos</a>
        <p>administracion@hospital.org.ar / turnos@hospital.org.ar</p>
        <p>facturacion@hospital.org.ar</p>'''
        self.assertEqual(MODULE.extract_emails(html), {
            'turnos@hospital.org.ar', 'administracion@hospital.org.ar',
            'facturacion@hospital.org.ar'
        })

    def test_does_not_invent_addresses_from_a_website_domain(self):
        self.assertEqual(MODULE.extract_emails('<a href="https://hospital.org.ar/contacto">Contacto</a>'), set())

    def test_accepts_same_site_contact_links_not_external_links(self):
        links = MODULE.contact_links(
            '<a href="/contacto">Contacto</a><a href="https://hospital.org.ar/turnos">Turnos</a>'
            '<a href="https://other.org.ar/contacto">Other</a><a href="/servicios">Services</a>',
            'https://hospital.org.ar/',
            5
        )
        self.assertIn('https://hospital.org.ar/contacto', links)
        self.assertIn('https://hospital.org.ar/turnos', links)
        self.assertEqual(len(links), 2)

    def test_enforces_http_hosts_before_fetching(self):
        self.assertIsNone(MODULE.safe_site_url('javascript:alert(1)'))
        self.assertIsNone(MODULE.safe_site_url('https://localhost/private'))
        self.assertIsNone(MODULE.safe_site_url('https://127.0.0.1:443/'))
        self.assertEqual(MODULE.safe_site_url('www.exampleclinic.com.ar'), 'https://www.exampleclinic.com.ar/')

    def test_same_origin_excludes_subdomain_crossovers(self):
        self.assertFalse(MODULE.same_site('https://other.example.com/', 'https://example.com/'))
        self.assertTrue(MODULE.same_site('https://www.example.com/contacto', 'https://example.com/'))

    def test_no_source_promotion_without_review(self):
        self.assertEqual(MODULE.NEW_DISCOVERY_STATUS, 'candidate_unreviewed')


if __name__ == '__main__':
    unittest.main()
