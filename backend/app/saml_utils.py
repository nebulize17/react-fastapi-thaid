import uuid
import base64
from datetime import datetime, timedelta, timezone
from lxml import etree
from signxml import XMLSigner, methods

def generate_signed_saml_response(
    username: str,
    acs_url: str,
    issuer_entity_id: str,
    request_id: str,
    cert_path: str = "idp.crt",
    key_path: str = "idp.key"
) -> str:
    """
    Generates a signed SAML 2.0 Response for FortiGate Captive Portal.
    """
    now = datetime.now(timezone.utc)
    issue_instant = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    not_on_or_after = (now + timedelta(minutes=5)).strftime("%Y-%m-%dT%H:%M:%SZ")
    
    response_id = f"_{uuid.uuid4().hex}"
    assertion_id = f"_{uuid.uuid4().hex}"
    
    # In-Reply-To attribute is often required if request_id is provided
    in_response_to_attr = f' InResponseTo="{request_id}"' if request_id else ""

    xml_template = f"""<?xml version="1.0" encoding="UTF-8"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" 
                xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" 
                ID="{response_id}" 
                Version="2.0" 
                IssueInstant="{issue_instant}" 
                Destination="{acs_url}"{in_response_to_attr}>
    <saml:Issuer>{issuer_entity_id}</saml:Issuer>
    <samlp:Status>
        <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
    </samlp:Status>
    <saml:Assertion ID="{assertion_id}" Version="2.0" IssueInstant="{issue_instant}">
        <saml:Issuer>{issuer_entity_id}</saml:Issuer>
        <saml:Subject>
            <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified">{username}</saml:NameID>
            <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
                <saml:SubjectConfirmationData NotOnOrAfter="{not_on_or_after}" Recipient="{acs_url}"{in_response_to_attr}/>
            </saml:SubjectConfirmation>
        </saml:Subject>
        <saml:Conditions NotBefore="{issue_instant}" NotOnOrAfter="{not_on_or_after}">
            <saml:AudienceRestriction>
                <saml:Audience>{acs_url}</saml:Audience>
            </saml:AudienceRestriction>
        </saml:Conditions>
        <saml:AuthnStatement AuthnInstant="{issue_instant}" SessionIndex="{assertion_id}">
            <saml:AuthnContext>
                <saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef>
            </saml:AuthnContext>
        </saml:AuthnStatement>
        <saml:AttributeStatement>
            <saml:Attribute Name="username" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
                <saml:AttributeValue>{username}</saml:AttributeValue>
            </saml:Attribute>
        </saml:AttributeStatement>
    </saml:Assertion>
</samlp:Response>"""

    # Parse XML
    root = etree.fromstring(xml_template.encode('utf-8'))

    # Load Key and Cert
    with open(key_path, "rb") as f:
        private_key = f.read()
    with open(cert_path, "rb") as f:
        cert = f.read()

    # Sign the Assertion (FortiGate usually requires Assertion to be signed, or the whole Response)
    # We will sign the Response to be safe, FortiGate accepts signed Responses.
    signer = XMLSigner(method=methods.enveloped, signature_algorithm="rsa-sha256", digest_algorithm="sha256")
    
    # signxml expects to find the node to sign based on ID. 
    # By default it signs the root node if reference_uri is not specified or points to root.
    signed_root = signer.sign(root, key=private_key, cert=cert, reference_uri=f"#{response_id}")
    
    signed_xml_bytes = etree.tostring(signed_root, encoding='utf-8')
    return base64.b64encode(signed_xml_bytes).decode('utf-8')
