// Spinner from loading.io

export function add_spinner(el) {
    const spinner = document.createElement('div');
    spinner.className = 'lds-ring';
    spinner.id = 'spinner';

    for (let i = 0; i <= 3; i ++) {
        spinner.appendChild(document.createElement('div'));
    }

    el.appendChild(spinner);
}