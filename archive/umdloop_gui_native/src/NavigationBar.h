#ifndef NAVIGATIONBAR_H
#define NAVIGATIONBAR_H

#include <QWidget>
#include <QPushButton>
#include <QHBoxLayout>
#include <QLabel>
#include <vector>

// Navigation Bar Widget
class NavigationBar : public QWidget {
    Q_OBJECT
public:
    explicit NavigationBar(QWidget *parent = nullptr);

signals:
    void modeChanged(int modeIndex);

private:
    std::vector<QPushButton*> modeButtons;
    int selectedMode = 0;
    void onButtonClicked(int index);
};

#endif // NAVIGATIONBAR_H
