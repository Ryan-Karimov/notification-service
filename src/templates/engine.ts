import Handlebars from 'handlebars';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('template-engine');

Handlebars.registerHelper('uppercase', (str: string) => str?.toUpperCase());
Handlebars.registerHelper('lowercase', (str: string) => str?.toLowerCase());
Handlebars.registerHelper('capitalize', (str: string) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
});
Handlebars.registerHelper('formatDate', (date: string | Date, format?: string) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
});

export interface RenderResult {
  subject?: string;
  body: string;
}

export function extractVariables(template: string): string[] {
  const regex = /\{\{([^{}]+)\}\}/g;
  const variables = new Set<string>();
  let match;

  while ((match = regex.exec(template)) !== null) {
    const variable = match[1]?.trim();
    if (variable && !variable.startsWith('#') && !variable.startsWith('/') && !variable.startsWith('!')) {
      const baseName = variable.split(' ')[0];
      if (baseName && !['if', 'else', 'each', 'unless', 'with'].includes(baseName)) {
        variables.add(baseName.replace(/^this\./, ''));
      }
    }
  }

  return Array.from(variables);
}

export function compileTemplate(template: string): HandlebarsTemplateDelegate {
  try {
    return Handlebars.compile(template, { strict: false });
  } catch (error) {
    logger.error({ error, template }, 'Failed to compile template');
    throw new Error('Invalid template syntax');
  }
}

export function renderTemplate(
  subjectTemplate: string | null,
  bodyTemplate: string,
  variables: Record<string, unknown>
): RenderResult {
  try {
    const bodyCompiled = compileTemplate(bodyTemplate);
    const body = bodyCompiled(variables);

    let subject: string | undefined;
    if (subjectTemplate) {
      const subjectCompiled = compileTemplate(subjectTemplate);
      subject = subjectCompiled(variables);
    }

    return { subject, body };
  } catch (error) {
    logger.error({ error }, 'Failed to render template');
    throw new Error('Failed to render template');
  }
}

export function validateTemplate(template: string): { valid: boolean; error?: string } {
  try {
    Handlebars.compile(template);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid template',
    };
  }
}
