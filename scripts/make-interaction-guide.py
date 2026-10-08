"""Build the illustrated English interaction guide (requires reportlab)."""
from pathlib import Path
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'output/pdf/pipelinemedic-interaction-guide.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='GuideTitle', fontName='Helvetica-Bold', fontSize=25, leading=29, textColor=colors.HexColor('#142d30'), spaceAfter=14))
styles.add(ParagraphStyle(name='GuideBody', fontName='Helvetica', fontSize=10.5, leading=15, spaceAfter=9, textColor=colors.HexColor('#26383c')))
styles.add(ParagraphStyle(name='GuideStep', parent=styles['GuideBody'], leftIndent=12, firstLineIndent=-12))
styles.add(ParagraphStyle(name='GuideNote', parent=styles['GuideBody'], fontSize=9, leading=13, backColor=colors.HexColor('#edf6f2'), borderPadding=9, spaceBefore=8, spaceAfter=13))
story=[]
def title(kicker, text):
    story.append(Paragraph(kicker.upper(), styles['Heading3']))
    story.append(Paragraph(text, styles['GuideTitle']))
def p(text): story.append(Paragraph(text, styles['GuideBody']))
def step(n,text): story.append(Paragraph(f'<b>{n}.</b> {text}',styles['GuideStep']))
def note(text): story.append(Paragraph(text,styles['GuideNote']))
def shot(name,caption):
    path=ROOT/'demo/frames'/name
    w,h=ImageReader(str(path)).getSize()
    story.append(Image(str(path),width=483,height=483*h/w))
    story.append(Spacer(1,5))
    story.append(Paragraph(caption,styles['GuideBody']))
def page(): story.append(PageBreak())

title('PipelineMedic / Interaction guide','From a failed run to a verified next step')
p('A practical walkthrough for developers, DevOps engineers and hackathon reviewers. Version 0.3 | October 8, 2026. All screenshots show synthetic demo data.')
shot('01-dashboard.png','The dashboard gathers cross-provider health and routes failures into one investigation workflow.')
story.append(Paragraph('Start locally',styles['Heading2']))
step(1,'Install Node.js 24 or newer and clone <link href="https://github.com/nguyenphu123/pipelinemedic" color="#167b65">github.com/nguyenphu123/pipelinemedic</link>.')
step(2,'In the project folder run <font name="Courier">npm ci</font>, then <font name="Courier">npm run dev</font>. Open <font name="Courier">http://127.0.0.1:3000</font>.')
step(3,'Start with the synthetic runs and local rules provider. No API key, CI account or model download is needed for this walkthrough.')
note('Alternative: run docker compose up --build and open port 3000. Docker execution has not been validated on the development machine. A shared screenshot may show port 3002; use the port printed by your own server.')
page()

title('01 / Investigate a stored failure','Follow the evidence')
shot('04-evidence-highlight.png','A finding citation highlights its supporting log line. Check that line before acting on a recommendation.')
step(1,'Open <b>Dashboard</b> and use <b>Investigate failures</b>, or choose <b>Advisor</b> from navigation.')
step(2,'Select a failed run from <b>Failure inbox</b>. Review the pipeline, branch, commit, duration, runner location and failed-job count.')
step(3,'Switch between <b>Job log</b> and <b>Pipeline config</b> to compare the failed operation with its configuration.')
step(4,'Choose the local rules option under <b>Investigate with</b> and click <b>Investigate run</b>. Read the summary, certainty, causes, next steps and verification checks.')
step(5,'Click an evidence citation. The matching numbered log line is highlighted. For the registry-denial example, verify permissions and image destination before changing credentials.')
note('Expected outcome: a grounded diagnosis with supporting lines and checks. Rules mode is deterministic pattern matching, not an AI call. PipelineMedic offers advice; it does not execute repair commands or change infrastructure.')
page()

title('02 / Pipeline catalog','Review and revise configuration')
shot('06-config-review.png','The configuration workbench keeps an editable draft and a local revision trail.')
step(1,'Open <b>Pipelines</b>, filter or search the catalog, and select a pipeline.')
step(2,'Review its provider, configuration path, enabled state and version. Use the editor or upload a supported configuration file.')
step(3,'Make a small change, such as a comment explaining a runtime requirement. Add a meaningful revision note and click <b>Save changes</b>.')
step(4,'Confirm the version increases and inspect the revision history. Download configuration when you need a local copy.')
step(5,'Use <b>Add pipeline</b> to register another local catalog entry. Enabling or pausing a record changes this catalog; it does not start or pause jobs at the CI provider.')
note('Expected outcome: a saved configuration and revision metadata in local SQLite. Structural checks recognize supported provider shapes; use the provider native linter for full validation. Keep credential values in the CI secret store and reference variables in configuration.')
page()

title('03 / Log sandbox','Try an ad hoc failure')
shot('14-sandbox-result.png','The sandbox presents evidence-linked findings and verification steps for pasted or uploaded logs.')
step(1,'Open <b>Log sandbox</b>. Start with a sample case, or paste/upload a plain-text failed-stage log. Configuration is optional.')
step(2,'Set the CI platform, runner location and deployment target independently. Confirm configuration belongs to the current log.')
step(3,'Review the redaction preview, choose local rules or a configured model provider, then click <b>Diagnose failure</b>.')
step(4,'Inspect citations, suggestions and verification steps. Use <b>Copy report</b> or <b>Download report</b> to export a sanitized Markdown diagnosis.')
step(5,'Try the timeout sample. A sparse timeout should request more context rather than assert a particular firewall or networking cause.')
note('Expected outcome: known samples produce evidence-backed findings; ambiguous inputs identify missing evidence. Logs are limited to 100,000 characters / 4,000 lines; configuration to 30,000 characters. Review redaction yourself because it is best effort.')
page()

title('04 / Optional integrations','Choose where analysis runs')
story.append(Paragraph('Cloud or self-hosted AI',styles['Heading2']))
step(1,'Copy <font name="Courier">.env.example</font> to <font name="Courier">.env</font> locally. For cloud AI set CLOUD_BASE_URL, CLOUD_API_KEY and CLOUD_MODEL. For Ollama set OLLAMA_BASE_URL and OLLAMA_MODEL, and install the model separately.')
step(2,'Restart the server. Open <b>Connection settings</b> in the sandbox to see provider configuration status, then run a diagnosis to test connectivity.')
step(3,'Choose the configured provider in Advisor or Log sandbox. Cloud analysis sends sanitized context to that provider; Ollama sends it to the configured model server.')
note('Configured means settings exist, not that connectivity or model quality was tested. No live-model accuracy claim is made for this demo. An unavailable AI provider returns an error; it does not silently substitute rules output. Never put API keys in logs, browser fields or committed files.')
story.append(Paragraph('Read-only MCP',styles['Heading2']))
p('Configure a stdio-compatible client to launch Node with the absolute path to <font name="Courier">mcp/server.js</font>. See the repository README for the complete JSON configuration and optional environment file. Use these four tools:')
for name,desc in [('list_pipeline_runs','List normalized runs, optionally filtered by status.'),('diagnose_run','Analyze a stored run with log and configuration context.'),('diagnose_pipeline','Analyze an ad hoc log and optional configuration.'),('list_sample_cases','Load the six labeled synthetic examples.')]:
    p(f'<font name="Courier"><b>{name}</b></font><br/>{desc}')
story.append(Paragraph('If something does not work',styles['Heading2']))
p('<b>Setup needed:</b> configure the provider and restart, or use rules mode. <b>Unauthorized:</b> enter the operator-configured workspace access token in Connection settings. <b>Docker cannot reach Ollama:</b> use host.docker.internal for a host model server. <b>No grounded finding:</b> provide the relevant failed stage and matching configuration; keep the uncertainty explicit.')
p('Return to the repository README for setup details, test commands, access controls and known limits. Stored runs and configurations persist in SQLite; sandbox input remains in request/browser state.')

def footer(canvas,doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor('#b9d3ca')); canvas.line(56,48,539,48)
    canvas.setFont('Helvetica',8); canvas.setFillColor(colors.HexColor('#5a6f72'))
    canvas.drawString(56,33,'PipelineMedic | Interaction guide | Synthetic demo data')
    canvas.drawRightString(539,33,f'{doc.page}')
    canvas.restoreState()
doc=SimpleDocTemplate(str(OUT),pagesize=(595.28,841.89),rightMargin=56,leftMargin=56,topMargin=44,bottomMargin=64,title='PipelineMedic Interaction Guide',author='PipelineMedic contributors')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
