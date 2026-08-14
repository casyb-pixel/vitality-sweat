import {
  COMMUNITY_GUIDELINES_PAGE,
  TERMS_PAGE,
} from "@/lib/legal/terms-2026-08-14";
import type { PolicyBlock, PolicyPage } from "@/lib/legal/policy-types";

export type { PolicyBlock, PolicyPage };
export {
  CURRENT_TERMS_VERSION,
  TERMS_ACCEPT_LABEL,
  TERMS_LAST_UPDATED,
} from "@/lib/legal/terms-2026-08-14";

export const POLICY_PAGES: Record<string, PolicyPage> = {
  "return-policy": {
    slug: "return-policy",
    title: "Return Policy",
    description: "Vitality Sweat return, refund, and exchange policy for merchandise orders.",
    sourceUrl: "https://vitalitysweat.blogspot.com/p/return-policy.html",
    blocks: [
      { type: "h2", text: "Introduction" },
      { type: "p", text: "At Vitality Sweat, we strive to ensure your complete satisfaction with your purchase. If you are not entirely satisfied with your purchase, we're here to help." },
      { type: "h2", text: "Return Policy" },
      { type: "h3", text: "Eligibility for Returns" },
      { type: "p", text: "To be eligible for a return, your item must be:" },
      { type: "ul", items: ["Unused and in the same condition that you received it.", "In the original packaging.", "Accompanied by a receipt or proof of purchase."] },
      { type: "h3", text: "Return Process" },
      { type: "ul", items: ["Initiate a Return: To initiate a return, please contact us at returns@vitalitysweat.com with your order number and details about the product you wish to return.", "Return Authorization: We will review your request and, if approved, provide you with a Return Authorization Number (RAN) and instructions on where to send your return.", "Shipping Your Return: Once you receive the RAN, package the item securely and send it to the address provided. You are responsible for paying your own shipping costs for returning your item. Shipping costs are non-refundable."] },
      { type: "h3", text: "Refunds" },
      { type: "p", text: "Once we receive your returned item, we will inspect it and notify you of the approval or rejection of your refund." },
      { type: "ul", items: ["Approved Refunds: If your return is approved, we will process your refund to your original method of payment. The credit may take several days to appear on your account, depending on your bank or credit card issuer.", "Partial Refunds: In certain situations, only partial refunds may be granted (if applicable), such as items not in their original condition, damaged, or missing parts for reasons not due to our error."] },
      { type: "h3", text: "Exchanges" },
      { type: "p", text: "We only replace items if they are defective or damaged. If you need to exchange an item for the same product, contact us at returns@vitalitysweat.com for further instructions." },
      { type: "h3", text: "Non-Returnable Items" },
      { type: "p", text: "Certain types of goods are exempt from being returned, including:" },
      { type: "ul", items: ["Perishable goods such as food, flowers, newspapers, or magazines.", "Intimate or sanitary goods.", "Hazardous materials or flammable liquids or gases.", "Gift cards.", "Downloadable software products.", "Some health and personal care items."] },
      { type: "h3", text: "Sale Items" },
      { type: "p", text: "Only regular-priced items may be refunded. Sale items are non-refundable." },
      { type: "h3", text: "Gifts" },
      { type: "p", text: "If the item was marked as a gift when purchased and shipped directly to you, you’ll receive a gift credit for the value of your return. Once the returned item is received and approved, a gift certificate will be mailed to you." },
      { type: "h2", text: "Contact Information" },
      { type: "p", text: "If you have any questions about our return policy, please contact us at:" },
      { type: "p", text: "Vitality Sweat Email: returns@vitalitysweat.com Website: vitalitysweat.com" },
    ],
  },
  terms: TERMS_PAGE,
  "community-guidelines": COMMUNITY_GUIDELINES_PAGE,
  "privacy": {
    slug: "privacy",
    title: "Privacy Policy",
    description: "How Vitality Sweat collects, uses, and protects personal information.",
    sourceUrl: "https://vitalitysweat.blogspot.com/p/privacy-policy.html",
    blocks: [
      { type: "h2", text: "Introduction" },
      { type: "p", text: "At Vitality Sweat, accessible from vitalitysweat.com, one of our main priorities is the privacy of our visitors. This Privacy Policy document outlines the types of information we collect and how we use it to improve our content, enhance customer experience, and for our internal marketing purposes. We do not share this information with any outside entities. If you have additional questions or require more information about our Privacy Policy, do not hesitate to contact us at info@vitalitysweat.com." },
      { type: "h2", text: "Information We Collect" },
      { type: "h3", text: "Personal Information" },
      { type: "ul", items: ["Name", "Email address", "Mailing address", "Phone number", "Other details to help enhance your experience"] },
      { type: "h3", text: "Non-Personal Information" },
      { type: "p", text: "We may also collect non-personal identification information whenever you interact with our website. This may include the browser name, the type of computer, and technical information about your means of connection to our site, such as the operating system and the Internet service providers utilized and other similar information." },
      { type: "h2", text: "How We Use Your Information" },
      { type: "p", text: "We use the information we collect in the following ways:" },
      { type: "ul", items: ["To personalize your experience and to allow us to deliver the type of content and product offerings in which you are most interested.", "To improve our website in order to better serve you.", "To send periodic emails regarding your order or other products and services.", "To follow up with you after correspondence (live chat, email, or phone inquiries)."] },
      { type: "h2", text: "Internal Marketing Purposes" },
      { type: "p", text: "We may use the information you provide for our internal marketing purposes, such as analyzing customer preferences and improving our marketing strategies. We do not share your information with any outside entities for marketing or other purposes." },
      { type: "h2", text: "How We Protect Your Information" },
      { type: "p", text: "We implement a variety of security measures to maintain the safety of your personal information when you enter, submit, or access your personal information." },
      { type: "h2", text: "Sharing Your Information" },
      { type: "p", text: "We do not sell, trade, or otherwise transfer to outside parties your Personally Identifiable Information. This does not include website hosting partners and other parties who assist us in operating our website, conducting our business, or serving our users, so long as those parties agree to keep this information confidential. We may also release information when it's release is appropriate to comply with the law, enforce our site policies, or protect ours or others' rights, property or safety." },
      { type: "h2", text: "Cookies" },
      { type: "p", text: "Vitality Sweat uses 'cookies' to enhance user experience. Your web browser places cookies on your hard drive for record-keeping purposes and sometimes to track information about them. You may choose to set your web browser to refuse cookies or to alert you when cookies are being sent. If they do so, note that some parts of the site may not function properly." },
      { type: "h2", text: "Third-Party Links" },
      { type: "p", text: "Occasionally, at our discretion, we may include or offer third-party products or services on our website. These third-party sites have separate and independent privacy policies. We therefore have no responsibility or liability for the content and activities of these linked sites. Nonetheless, we seek to protect the integrity of our site and welcome any feedback about these sites." },
      { type: "h2", text: "Changes to This Privacy Policy" },
      { type: "p", text: "Vitality Sweat has the discretion to update this privacy policy at any time. When we do, we will post a notification on the main page of our site, revise the updated date at the bottom of this page. We encourage Users to frequently check this page for any changes to stay informed about how we are helping to protect the personal information we collect." },
      { type: "h2", text: "Your Acceptance of These Terms" },
      { type: "p", text: "By using this site, you signify your acceptance of this Privacy Policy. If you do not agree to this policy, please do not use our website. Your continued use of the site following the posting of changes to this policy will be deemed your acceptance of those changes." },
      { type: "h2", text: "Contact Information" },
      { type: "p", text: "If you have any questions about this Privacy Policy, the practices of this site, or your dealings with this site, please contact us at:" },
      { type: "p", text: "Vitality Sweat Email: info@vitalitysweat.com Website: vitalitysweat.com" },
    ],
  },
};

export function getPolicyPage(slug: string): PolicyPage | undefined {
  return POLICY_PAGES[slug];
}
