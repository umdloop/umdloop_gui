#ifndef GENERICPAGE_H
#define GENERICPAGE_H

#include <QWidget>
#include <QLabel>
#include <string>

// Generic Page (for modes not fully implemented yet)
class GenericPage : public QWidget {
    Q_OBJECT
public:
    explicit GenericPage(const std::string &mode, int subsystem, QWidget *parent = nullptr);
    void updateSubsystem(int subsystem);

private:
    std::string modeName;
    int currentSubsystem;
    QLabel *titleLabel;
    void updateTitle();
};

#endif // GENERICPAGE_H
