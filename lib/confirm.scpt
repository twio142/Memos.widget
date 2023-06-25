run = () => {
    let a = Application.currentApplication();
    a.includeStandardAdditions = true;
    try {
        return a.displayDialog('Remove this memo?', {buttons: ['Cancel', 'OK'], defaultButton: 'OK', cancelButton: 'Cancel', withIcon: 'stop'}).buttonReturned;
    } catch {}
}
