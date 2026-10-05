import re
import subprocess
import time
from xml.etree import ElementTree as ET


def snapshot(name):
    subprocess.run(['adb', 'shell', 'uiautomator', 'dump', '/sdcard/zeroapply.xml'], check=True)
    path = 'android-download/' + name + '.xml'
    subprocess.run(['adb', 'pull', '/sdcard/zeroapply.xml', path], check=True)
    return list(ET.parse(path).iter('node'))


def tap(node):
    bounds = list(map(int, re.findall(r'\d+', node.get('bounds', ''))))
    if len(bounds) != 4:
        raise SystemExit('Control has no usable tap bounds')
    subprocess.run(['adb', 'shell', 'input', 'tap', str((bounds[0]+bounds[2])//2), str((bounds[1]+bounds[3])//2)], check=True)


nodes = snapshot('launch')
guest = next((node for node in nodes if 'Continue as Guest' in node.get('text', '')), None)
if guest is None:
    raise SystemExit('Existing ZeroApply login screen did not open')
tap(guest)
time.sleep(4)
nodes = snapshot('dashboard')
texts = ' '.join(node.get('text', '') for node in nodes)
if 'Candidate Persona' not in texts or 'Resume' not in texts:
    raise SystemExit('Existing mobile dashboard and navigation did not open: ' + texts[-2000:])
if 'saiprasad.chary@gmail.com' in texts or 'Sai Prasad Chary' in texts:
    raise SystemExit('Android contains a seeded personal profile')
resume = next((node for node in nodes if node.get('text') == 'Resume'), None)
if resume is None:
    raise SystemExit('Existing Resume navigation is missing')
tap(resume)
time.sleep(3)
nodes = snapshot('resume')
if not any('Contact & Online Footprint' in node.get('text', '') for node in nodes):
    raise SystemExit('Resume screen did not open')
browser = next((node for node in nodes if node.get('text') == 'Browser'), None)
if browser is None:
    raise SystemExit('Browser navigation is missing')
tap(browser)
time.sleep(2)
nodes = snapshot('browser')
if not any('LinkedIn with phone AI' in node.get('text', '') for node in nodes):
    raise SystemExit('Android browser explanation did not open')
log = subprocess.check_output(['adb', 'logcat', '-d', '-s', 'AndroidRuntime:E'], text=True)
if 'FATAL EXCEPTION' in log:
    raise SystemExit('Android app crashed: ' + log[-2000:])
print('PASS: APK install, original login, blank guest profile, original navigation and Resume screen')
