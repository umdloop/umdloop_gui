#include "NavigationBar.h"
#include "Constants.h"

NavigationBar::NavigationBar(QWidget *parent) : QWidget(parent) {
    auto *layout = new QHBoxLayout(this);
    layout->setContentsMargins(10, 5, 10, 5);

    // Logo
    auto *logo = new QLabel("LOOP GUI", this);
    logo->setStyleSheet("color: white; font-size: 20px; font-weight: bold;");
    layout->addWidget(logo);
    layout->addSpacing(20);

    // Mode buttons
    for (size_t i = 0; i < MODES.size(); ++i) {
        auto *btn = new QPushButton(QString::fromStdString(MODES[i]), this);
        btn->setMinimumWidth(90);
        btn->setStyleSheet(
            "background-color: #ffffffff; "
            "color: white; "
            "border-radius: 8px; "
            "padding: 15px; "
            "font-size: 12px;"
        );

        connect(btn, &QPushButton::clicked, this, [this, i]() { onButtonClicked(i); });

        modeButtons.push_back(btn);
        layout->addWidget(btn);
    }

    setStyleSheet("background-color: #525252;");

    // Select first mode by default
    if (!modeButtons.empty()) {
        modeButtons[0]->setStyleSheet(
            "background-color: #262626; "
            "color: white; "
            "border-radius: 8px; "
            "padding: 15px; "
            "font-size: 12px;"
        );
    }
}

void NavigationBar::onButtonClicked(int index) {
    for (size_t i = 0; i < modeButtons.size(); ++i) {
        if (i == static_cast<size_t>(index)) {
            modeButtons[i]->setStyleSheet(
                "background-color: #262626; "
                "color: white; "
                "border-radius: 8px; "
                "padding: 15px; "
                "font-size: 12px;"
            );
        } else {
            modeButtons[i]->setStyleSheet(
                "background-color: #3d3d3d; "
                "color: white; "
                "border-radius: 8px; "
                "padding: 15px; "
                "font-size: 12px;"
            );
        }
    }
    selectedMode = index;
    emit modeChanged(index);
}
