#ifndef SUBSYSTEMWIDGET_H
#define SUBSYSTEMWIDGET_H

#include <QWidget>
#include <QPushButton>
#include <QHBoxLayout>
#include <vector>

// Subsystem Selection Widget
class SubsystemWidget : public QWidget {
    Q_OBJECT
public:
    explicit SubsystemWidget(QWidget *parent = nullptr);

signals:
    void subsystemChanged(int subsystemIndex);

private:
    std::vector<QPushButton*> subsystemButtons;
    int selectedSubsystem = 0;
    void onButtonClicked(int index);
};

#endif // SUBSYSTEMWIDGET_H
