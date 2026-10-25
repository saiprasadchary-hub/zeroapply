from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from PIL import Image
from pypdf import PdfReader

steps = [
('1.24.26', 'Select a job from search results',
 'The LinkedIn search results show Python-related jobs near Hyderabad. The selected listing is Python Developer at Viraaj HR Solutions Private Limited, and its details appear beside the results.',
 'Workflow action: Open a job card, check the role and location, and identify whether Easy Apply is available.'),
('1.24.42', 'Open Easy Apply',
 'The Easy Apply button is highlighted beneath the selected job details. This is the entry point for applying within LinkedIn.',
 'Workflow action: Activate Easy Apply to open the application form for this employer.'),
('1.25.00', 'Check contact information',
 'The application opens on page 1 of 5. The contact section contains first name, last name, phone country code, mobile number, and an email field farther down.',
 'Workflow action: Review the populated contact details and fill any missing required fields before continuing.'),
('1.25.28', 'Finish contact details and continue',
 'The lower part of the contact form shows the email address and Hyderabad location. The Next button at the bottom of the dialog is highlighted.',
 'Workflow action: Scroll within the application dialog, verify all required contact fields, and select Next.'),
('1.25.40', 'Choose the resume',
 'Page 2 of 5 displays previously uploaded resumes. The first PDF, dated October 8, 2026, is selected, indicated by the green selection circle.',
 'Workflow action: Confirm the intended resume or upload a replacement, then continue. The supplied sequence does not include a separate screenshot of page 3.'),
('1.26.07', 'Identify the employer questions',
 'Page 4 of 5 asks for notice period in days, current annual CTC in INR, expected annual CTC in INR, and professional experience below. The visible text fields are still empty.',
 'Workflow action: Match each required question to the applicant\'s information and enter the appropriate answer.'),
('1.26.14', 'Read field instructions before answering',
 'The same work-experience page highlights the notice-period guidance: the value should be entered in days. Salary helper text also specifies annual amounts in INR.',
 'Workflow action: Use the requested units when entering answers. Values such as 45, 200000, and 350000 shown in the helper text are examples, not the applicant\'s answers.'),
('1.27.17', 'Review the application and submit',
 'The review screen shows the entered answers, including current CTC of INR 0, expected CTC of INR 4,500,000, 0 years and 1 additional month of experience, Hyderabad, and a LinkedIn profile URL.',
 'Workflow action: Check the answers and selected resume, confirm the company-follow preference, and select Submit application when ready. This screenshot shows the submission button before confirmation.'),
('1.27.27', 'Confirm successful submission',
 'A confirmation dialog states that the application was sent to Viraaj HR Solutions Private Limited. It also says the application can be tracked in the Applied tab of My Jobs.',
 'Workflow result: Submission is confirmed. LinkedIn then offers an optional profile update using the resume.'),
('1.27.38', 'Dismiss the optional profile update',
 'The success dialog remains open, with Not now highlighted beside Update profile. The application has already been sent.',
 'Workflow action: Select Not now to dismiss the optional profile-update prompt and return to the job results.'),
('1.27.51', 'Return to results and target the next job',
 'The dialog is closed and the previous job shows an application-submitted status. The Infosys listing titled Android, Mobile Device Testing, Python automation is highlighted in the results.',
 'Workflow action: Open the next suitable job and repeat the application steps. Its details have not yet replaced the previous job in this screenshot.'),
]
output = Path('output/pdf/Workflow.pdf').resolve()
c = canvas.Canvas(str(output), pagesize=(900,800), pageCompression=1)
c.setTitle('Workflow')
c.setAuthor('ZeroApply')
c.setSubject('LinkedIn Easy Apply workflow illustrated with 11 supplied screenshots')
style = ParagraphStyle('body', fontName='Helvetica', fontSize=12, leading=17, textColor=HexColor('#26364a'))
for i, (stamp, title, description, action) in enumerate(steps, 1):
    matches = list(Path('/Users/sriman/Documents').glob(f'Screenshot 2026-10-21 at {stamp}*PM.png'))
    assert len(matches) == 1, (stamp, matches)
    path = matches[0]
    c.setFillColor(HexColor('#0a66c2')); c.rect(0,792,900,8,fill=1,stroke=0)
    c.setFont('Helvetica-Bold',11); c.drawString(36,765,'WORKFLOW / LINKEDIN EASY APPLY')
    c.setFillColor(HexColor('#637287')); c.setFont('Helvetica',10)
    c.drawRightString(864,765,f'21 OCT 2026  |  {stamp.replace(".", ":")} PM')
    c.setFillColor(HexColor('#13253a')); c.setFont('Helvetica-Bold',22)
    c.drawString(36,731,f'{i:02d}  {title}')
    iw, ih = Image.open(path).size
    w=828; h=w*ih/iw
    bottom=710-h
    c.drawImage(str(path),36,bottom,width=w,height=h)
    y=bottom-18
    for text in (description, action):
        p=Paragraph(text, style); pw,ph=p.wrap(828,150)
        p.drawOn(c,36,y-ph); y-=ph+10
    assert y>42, (i,y)
    c.setStrokeColor(HexColor('#dce3eb')); c.line(36,40,864,40)
    c.setFont('Helvetica',9); c.setFillColor(HexColor('#637287'))
    c.drawString(36,23,'Screenshot walkthrough | Actions describe the illustrated application sequence.')
    c.drawRightString(864,23,f'{i} / {len(steps)}')
    c.showPage()
c.save()
r=PdfReader(output)
assert len(r.pages)==11
for i,p in enumerate(r.pages):
    assert steps[i][1] in p.extract_text()
    assert len(p.images)==1
print(f'Created {output} ({len(r.pages)} pages, {output.stat().st_size:,} bytes)')
