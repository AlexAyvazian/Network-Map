import importlib.util
from pathlib import Path
import unittest

PATH = Path(__file__).resolve().parents[1] / 'canada-contact-site-discovery.py'
SPEC = importlib.util.spec_from_file_location('canada_site_discovery', PATH)
M = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)


class CanadaOfficialWebsiteDiscoveryTests(unittest.TestCase):
    def test_accepts_only_close_exact_name_matched_osm_facility(self):
        facilities = [
            {'type': 'node','id': 123,'lat': 48.403,'lon': -89.250,
             'tags':{'name':'Thunder Bay General Hospital',
                     'website':'https://hospital.example.ca',
                     'contact:email':'appointments@hospital.example.ca;billing@hospital.example.ca'}}
        ]
        candidates=M.match_places(facilities,'Thunder Bay General Hospital',48.403,-89.250)
        self.assertEqual(len(candidates),1)
        self.assertEqual(candidates[0]['url'],'https://hospital.example.ca/')
        self.assertEqual(candidates[0]['emails'],{'appointments@hospital.example.ca','billing@hospital.example.ca'})
        self.assertEqual(candidates[0]['evidence_url'],'https://www.openstreetmap.org/node/123')

    def test_rejects_unrelated_and_far_away_sites(self):
        elements=[
            {'type':'node','id':7,'lat':48.403,'lon':-89.250,
             'tags':{'name':'Other Hospital','website':'https://otherhospital.ca'}},
            {'type':'way','id':8,'center':{'lat':49.403,'lon':-89.250},
             'tags':{'name':'Thunder Bay General Hospital','website':'https://farhospital.ca'}}]
        self.assertEqual(M.match_places(elements,'Thunder Bay General Hospital',48.403,-89.250),[])

    def test_no_url_is_invented_from_email_domain(self):
        elements=[{'type':'node','id':4,'lat':48.403,'lon':-89.250,
                   'tags':{'name':'Thunder Bay General Hospital','email':'hello@hospital.ca'}}]
        match=M.match_places(elements,'Thunder Bay General Hospital',48.403,-89.250)
        self.assertEqual(match[0]['url'],None)
        self.assertEqual(match[0]['emails'],{'hello@hospital.ca'})

    def test_direct_site_text_requires_facility_and_city_and_street(self):
        content='<html><h1>Thunder Bay General Hospital</h1><p>100 Hospital Lane, Thunder Bay, Ontario</p></html>'
        self.assertTrue(M.website_mentions_location(content,'Thunder Bay General Hospital','Thunder Bay','100 Hospital Lane'))
        self.assertFalse(M.website_mentions_location(content,'Thunder Bay General Hospital','Toronto','100 Hospital Lane'))
        self.assertFalse(M.website_mentions_location('<h1>Thunder Bay General Hospital</h1>','Thunder Bay General Hospital','Thunder Bay','100 Hospital Lane'))

    def test_weak_generic_names_are_not_matched(self):
        match=M.match_places([{'type':'node','id':8,'lat':48.403,'lon':-89.250,'tags':{'name':'Hospital','website':'https://anyhospital.ca'}}],'Hospital',48.403,-89.250)
        self.assertEqual(match,[])

    def test_any_unreviewed_osm_email_is_not_published(self):
        self.assertEqual(M.DISCOVERY_EMAIL_STATUS,'candidate_unreviewed')


if __name__ == '__main__':
    unittest.main()
