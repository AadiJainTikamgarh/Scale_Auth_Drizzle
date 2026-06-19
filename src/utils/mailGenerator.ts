interface MailTemplateOptions {
    title: string;
    greeting: string;
    introLines: string[];
    actionButton?: {
        text: string;
        link: string;
    };
    outroLines: string[];
}

export const generateEmailHtml = (options: MailTemplateOptions): string => {
    const { title, greeting, introLines, actionButton, outroLines } = options;

    const intros = introLines.map(line => `<p class="text">${line}</p>`).join("");
    const outros = outroLines.map(line => `<p class="text">${line}</p>`).join("");

    const buttonHtml = actionButton
        ? `
        <div class="btn-container">
            <a href="${actionButton.link}" class="btn" target="_blank">${actionButton.text}</a>
        </div>
        `
        : "";

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f4f5f6;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
        }
        .wrapper {
            width: 100%;
            background-color: #f4f5f6;
            padding: 40px 0;
        }
        .container {
            max-width: 580px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .header {
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.5px;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin-top: 0;
            margin-bottom: 16px;
        }
        .text {
            font-size: 15px;
            line-height: 1.6;
            color: #4b5563;
            margin-bottom: 16px;
        }
        .btn-container {
            text-align: center;
            margin: 32px 0;
        }
        .btn {
            display: inline-block;
            background-color: #4f46e5;
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 30px;
            font-weight: 600;
            font-size: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -1px rgba(79, 70, 229, 0.1);
        }
        .footer {
            background-color: #f9fafb;
            padding: 24px 30px;
            text-align: center;
            border-top: 1px solid #f3f4f6;
        }
        .footer p {
            font-size: 12px;
            color: #9ca3af;
            margin: 4px 0;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h1>Scale Auth</h1>
            </div>
            <div class="content">
                <h2 class="greeting">${greeting}</h2>
                ${intros}
                ${buttonHtml}
                ${outros}
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Scale Auth. All rights reserved.</p>
                <p>This is an automated system email, please do not reply directly.</p>
            </div>
        </div>
    </div>
</body>
</html>
    `;
};
