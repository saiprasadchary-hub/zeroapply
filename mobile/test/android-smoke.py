import re
import subprocess
import time
from pathlib import Path
from xml.etree import ElementTree as ET

def nodes(path):
    return list(ET.parse(path).iter('node'))

launch = nodes('android-download/zeroapply-launch.xml')
guest = next((node for node in launch if 'Continue on this device' in node.get('text', '')), None)
if guest is None:
    raise SystemExit('Android login/guest screen did not open')
numbers = list(map(int, re.findall(r'\d+', guest.get('bounds', ''))))
if len(numbers) != 4:
    raise SystemExit('Guest button has no tap bounds')
subprocess.run(['adb', 'shell', 'input', 'tap', str((numbers[0]+numbers[2])//2), str((numbers[1]+numbers[3])//2)], check=True)
time.sleep(3)
subprocess.run(['adb', 'shell', 'uiautomator', 'dump', '/sdcard/zeroapply-profile.xml'], check=True)
subprocess.run(['adb', 'pull', '/sdcard/zeroapply-profile.xml', 'android-download/zeroapply-profile.xml'], check=True)
profile = nodes('android-download/zeroapply-profile.xml')
text = ' '.join(node.get('text', '') for node in profile)
if 'Your professional profile' not in text or 'Full name' not in text:
    raise SystemExit('Guest profile screen did not open')
log = subprocess.check_output(['adb', 'logcat', '-d', '-s', 'AndroidRuntime:E'], text=True)
if 'FATAL EXCEPTION' in log:
    raise SystemExit('Android app crashed: ' + log[-2000:])
print('PASS: APK installed, login opened, guest profile opened, no Android crash')
