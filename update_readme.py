import os
from os.path import join

if __name__ == '__main__':
    with open('template.md') as f:
        template = f.read()
    data = sorted(os.listdir('data'), reverse=True)

    with open('readme_content_template.md') as f:
        readme_content_template = f.read()
    readme_content = "\n\n".join(
        [readme_content_template.format(date=item.replace('.md', ''),url=join('data', item)) for item in data if item.endswith('.md')]
    )
    markdown = template.format(readme_content=readme_content)
    with open('README.md', 'w') as f:
        f.write(markdown)
